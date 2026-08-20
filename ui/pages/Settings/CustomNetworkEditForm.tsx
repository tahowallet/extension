import { isBuiltInNetwork } from "@tallyho/tally-background/constants"
import {
  ALCHEMY_CAPABILITY_NAMESPACE,
  EVMNetwork,
  RpcEndpoint,
} from "@tallyho/tally-background/networks"
import {
  getChainRpcConfig,
  updateNetworkSettings,
} from "@tallyho/tally-background/redux-slices/networks"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import React, {
  FormEventHandler,
  ReactElement,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import logger from "@tallyho/tally-background/lib/logger"
import SharedButton from "../../components/Shared/SharedButton"
import SharedCheckbox from "../../components/Shared/SharedCheckbox"
import SharedIcon from "../../components/Shared/SharedIcon"
import SharedInput from "../../components/Shared/SharedInput"
import SharedNetworkIcon from "../../components/Shared/SharedNetworkIcon"
import SharedSlideUpMenuPanel from "../../components/Shared/SharedSlideUpMenuPanel"
import SharedTooltip from "../../components/Shared/SharedTooltip"
import { useBackgroundDispatch } from "../../hooks"
import { getBlockExplorerURL } from "../../utils/networks"

const ICON_PREVIEW_SIZE = 42
const STATIC_ICON_SIZE = 24

// Percentage of the viewport the hosting slide-up should occupy. The form body
// scrolls within it so the panel header stays put; see MENU_CHROME_HEIGHT.
const MENU_HEIGHT_VH = 90

/** Height to give the `SharedSlideUpMenu` that hosts this form. */
export const EDIT_FORM_MENU_HEIGHT = `${MENU_HEIGHT_VH}%`

// Vertical space taken above the scrolling form body by the slide-up's own top
// padding plus the panel header, both of which sit outside the scroll area.
const MENU_CHROME_HEIGHT = 68

const WEB_URL_PROTOCOLS = ["http:", "https:"]
const RPC_URL_PROTOCOLS = ["http:", "https:", "ws:", "wss:"]

/**
 * Domains that serve Alchemy's enhanced APIs. A hostname matches when it is
 * exactly one of these or sits beneath one as a subdomain.
 */
const ALCHEMY_DOMAINS = ["alchemy.com", "alchemyapi.io"]

/**
 * Whether an RPC URL points at Alchemy, and so can be assumed to serve the
 * `alchemy_*` namespace.
 */
function isAlchemyRpcUrl(value: string): boolean {
  let hostname: string

  try {
    hostname = new URL(value.trim()).hostname.toLowerCase()
  } catch (error) {
    return false
  }

  return ALCHEMY_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  )
}

function isValidUrl(value: string, allowedProtocols: string[]): boolean {
  try {
    return allowedProtocols.includes(new URL(value).protocol)
  } catch (error) {
    return false
  }
}

function isPositiveInteger(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) > 0
}

/**
 * A Taho-provided endpoint, reduced to what is safe to display. Managed URLs
 * embed an access key in their path, so only the origin is ever kept.
 */
type ManagedEndpointRow = {
  origin: string
  hasAlchemyApis: boolean
}

const toManagedEndpointRows = (
  endpoints: RpcEndpoint[],
): ManagedEndpointRow[] =>
  endpoints.flatMap(({ url, capabilities }) => {
    try {
      return [
        {
          origin: new URL(url).origin,
          hasAlchemyApis:
            capabilities?.includes(ALCHEMY_CAPABILITY_NAMESPACE) ?? false,
        },
      ]
    } catch (error) {
      // Drop anything whose origin can't be isolated rather than risk
      // rendering an access key.
      return []
    }
  })

type RpcEndpointRow = {
  id: number
  url: string
  hasAlchemyApis: boolean
  isTouched: boolean
}

type EditableFields = {
  name: string
  currencyName: string
  currencySymbol: string
  currencyDecimals: string
  blockExplorerUrl: string
  iconUrl: string
}

type Props = {
  network: EVMNetwork
  onComplete: () => void
}

export default function CustomNetworkEditForm({
  network,
  onComplete,
}: Props): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "settings.customNetworksSettings.editModal",
  })

  const dispatch = useBackgroundDispatch()

  // Built-in networks' metadata is bundled with the extension and immutable;
  // only their RPC endpoint list can be edited here.
  const isBuiltIn = isBuiltInNetwork(network)

  const [fields, setFields] = useState<EditableFields>({
    name: network.name,
    currencyName: network.baseAsset.name,
    currencySymbol: network.baseAsset.symbol,
    currencyDecimals: String(network.baseAsset.decimals),
    blockExplorerUrl: getBlockExplorerURL(network) ?? "",
    iconUrl: network.iconUrl ?? "",
  })
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<keyof EditableFields, boolean>>
  >({})

  // Null until the network's current RPC endpoints have been loaded.
  const [rpcEndpointRows, setRpcEndpointRows] = useState<
    RpcEndpointRow[] | null
  >(null)
  const nextRpcEndpointRowId = useRef(0)

  // Endpoints Taho runs for this chain. Read-only, and never submitted.
  const [managedEndpointRows, setManagedEndpointRows] = useState<
    ManagedEndpointRow[]
  >([])

  const [isIconBroken, setIsIconBroken] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  // Set from a failed save; the background reports unreachable or mismatched
  // endpoints by URL rather than throwing.
  const [saveError, setSaveError] = useState("")

  useEffect(() => {
    let isStale = false

    const loadRpcEndpoints = async () => {
      let rpcEndpoints: RpcEndpoint[] = []
      let managedRpcEndpoints: RpcEndpoint[] = []
      try {
        ;({ rpcEndpoints, managedRpcEndpoints } = (await dispatch(
          getChainRpcConfig(network.chainID),
        )) as unknown as AsyncThunkFulfillmentType<typeof getChainRpcConfig>)
      } catch (error) {
        // A network row with no stored endpoint config rejects the lookup
        // (and a rejected background call surfaces here as an undefined
        // payload). Fall back to a single empty row so the form stays
        // usable and the user can enter endpoints from scratch.
        logger.debug("Failed to load RPC endpoints for", network.chainID, error)
      }

      if (isStale) {
        return
      }

      setManagedEndpointRows(toManagedEndpointRows(managedRpcEndpoints))
      setRpcEndpointRows(
        (rpcEndpoints.length > 0 ? rpcEndpoints : [{ url: "" }]).map(
          ({ url, capabilities }) => {
            nextRpcEndpointRowId.current += 1
            return {
              id: nextRpcEndpointRowId.current,
              url,
              hasAlchemyApis:
                capabilities?.includes(ALCHEMY_CAPABILITY_NAMESPACE) ?? false,
              isTouched: false,
            }
          },
        ),
      )
    }

    loadRpcEndpoints()

    return () => {
      isStale = true
    }
  }, [dispatch, network.chainID])

  const updateField = (field: keyof EditableFields, value: string) => {
    // Shared inputs echo their initial value back on their first render; that
    // is not a user edit, so it should neither dirty nor touch the field.
    if (fields[field] === value) {
      return
    }

    setFields((existingFields) => ({ ...existingFields, [field]: value }))
    setTouchedFields((existingTouched) => ({
      ...existingTouched,
      [field]: true,
    }))

    if (field === "iconUrl") {
      setIsIconBroken(false)
    }
  }

  const updateRpcEndpointUrl = (id: number, url: string) => {
    // See the note in updateField about initial value echoes.
    if (rpcEndpointRows?.find((row) => row.id === id)?.url === url) {
      return
    }

    setRpcEndpointRows(
      (existingRows) =>
        existingRows?.map((row) => {
          if (row.id !== id) {
            return row
          }

          // Only the transition into an Alchemy URL flips the toggle on. That
          // way a manual uncheck sticks while the user keeps editing a URL
          // that still points at Alchemy, and the toggle is never forced off.
          const becameAlchemy =
            !isAlchemyRpcUrl(row.url) && isAlchemyRpcUrl(url)

          return {
            ...row,
            url,
            isTouched: true,
            hasAlchemyApis: becameAlchemy || row.hasAlchemyApis,
          }
        }) ?? null,
    )
  }

  const updateRpcEndpointAlchemyApis = (id: number, hasAlchemyApis: boolean) =>
    setRpcEndpointRows(
      (existingRows) =>
        existingRows?.map((row) =>
          row.id === id ? { ...row, hasAlchemyApis } : row,
        ) ?? null,
    )

  const removeRpcEndpointRow = (id: number) =>
    setRpcEndpointRows(
      (existingRows) => existingRows?.filter((row) => row.id !== id) ?? null,
    )

  const addRpcEndpointRow = () =>
    setRpcEndpointRows((existingRows) => {
      nextRpcEndpointRowId.current += 1
      return [
        ...(existingRows ?? []),
        {
          id: nextRpcEndpointRowId.current,
          url: "",
          hasAlchemyApis: false,
          isTouched: false,
        },
      ]
    })

  const requiredError = (value: string) =>
    value.trim() === "" ? t("errors.required") : ""

  const webUrlError = (value: string) =>
    isValidUrl(value.trim(), WEB_URL_PROTOCOLS) ? "" : t("errors.invalidUrl")

  const fieldErrors: Record<keyof EditableFields, string> = {
    name: requiredError(fields.name),
    currencyName: requiredError(fields.currencyName),
    currencySymbol: requiredError(fields.currencySymbol),
    currencyDecimals:
      requiredError(fields.currencyDecimals) ||
      (isPositiveInteger(fields.currencyDecimals.trim())
        ? ""
        : t("errors.invalidDecimals")),
    blockExplorerUrl:
      requiredError(fields.blockExplorerUrl) ||
      webUrlError(fields.blockExplorerUrl),
    iconUrl:
      fields.iconUrl.trim() === "" ? "" : webUrlError(fields.iconUrl.trim()),
  }

  const rpcUrlError = (value: string) => {
    const trimmedValue = value.trim()

    if (trimmedValue === "") {
      return t("errors.required")
    }

    return isValidUrl(trimmedValue, RPC_URL_PROTOCOLS)
      ? ""
      : t("errors.invalidRpcUrl")
  }

  const rpcUrlErrors = new Map(
    (rpcEndpointRows ?? []).map((row, index) => {
      // Later duplicates of an earlier row's URL are flagged rather than
      // silently merged away at save time, which would drop their
      // capability flags.
      const trimmedUrl = row.url.trim()
      const isDuplicate =
        trimmedUrl !== "" &&
        (rpcEndpointRows ?? [])
          .slice(0, index)
          .some(({ url }) => url.trim() === trimmedUrl)

      return [
        row.id,
        isDuplicate ? t("errors.duplicateRpcUrl") : rpcUrlError(row.url),
      ]
    }),
  )

  // A built-in network exposes only its block explorer for editing; the rest
  // of its metadata is bundled with the extension and renders as static rows.
  const editableFieldKeys = (
    isBuiltIn ? ["blockExplorerUrl"] : Object.keys(fieldErrors)
  ) as (keyof EditableFields)[]

  const isFormValid =
    rpcEndpointRows !== null &&
    rpcEndpointRows.length > 0 &&
    editableFieldKeys.every((key) => fieldErrors[key] === "") &&
    [...rpcUrlErrors.values()].every((error) => error === "")

  const trimmedIconUrl = fields.iconUrl.trim()
  const hasIconPreview =
    trimmedIconUrl !== "" && !isIconBroken && fieldErrors.iconUrl === ""

  const staticRows: { label: string; value: string }[] = [
    { label: t("chainId"), value: network.chainID },
    { label: t("family"), value: network.family },
    ...(isBuiltIn
      ? [
          { label: t("name"), value: network.name },
          { label: t("currencyName"), value: network.baseAsset.name },
          { label: t("currencySymbol"), value: network.baseAsset.symbol },
          {
            label: t("currencyDecimals"),
            value: String(network.baseAsset.decimals),
          },
        ]
      : []),
  ]

  const handleFormSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()

    if (!isFormValid || rpcEndpointRows === null || isSaving) {
      return
    }

    setIsSaving(true)
    setSaveError("")

    const rpcEndpoints: RpcEndpoint[] = rpcEndpointRows.map((row) => ({
      url: row.url.trim(),
      // Omitted entirely rather than set to an empty list when the endpoint
      // serves no enhanced APIs.
      ...(row.hasAlchemyApis
        ? { capabilities: [ALCHEMY_CAPABILITY_NAMESPACE] }
        : {}),
    }))

    const result = (await dispatch(
      updateNetworkSettings({
        chainID: network.chainID,
        rpcEndpoints,
        blockExplorerUrl: fields.blockExplorerUrl.trim(),
        // Identifying metadata is only editable — and only sent — for
        // custom networks; the background rejects it for built-ins.
        ...(isBuiltIn
          ? {}
          : {
              metadata: {
                chainName: fields.name.trim(),
                assetName: fields.currencyName.trim(),
                symbol: fields.currencySymbol.trim(),
                decimals: Number(fields.currencyDecimals.trim()),
                iconUrl: trimmedIconUrl === "" ? undefined : trimmedIconUrl,
              },
            }),
      }),
    )) as unknown as AsyncThunkFulfillmentType<typeof updateNetworkSettings>

    setIsSaving(false)

    if (!result.success) {
      // Endpoint probing failed; keep the form open so the offending URL can
      // be corrected.
      setSaveError(result.error)
      return
    }

    onComplete()
    await dispatch(setSnackbarMessage(t("snackbar.success")))
  }

  return (
    <SharedSlideUpMenuPanel header={isBuiltIn ? t("titleBuiltIn") : t("title")}>
      <div className="edit_network">
        <form onSubmit={handleFormSubmit}>
          <div className="static_rows">
            {staticRows.map(({ label, value }) => (
              <div className="static_row" key={label}>
                <span className="static_label">{label}</span>
                <span className="static_value">{value}</span>
              </div>
            ))}
            {isBuiltIn && (
              <div className="static_row">
                <span className="static_label">{t("icon")}</span>
                <SharedNetworkIcon size={STATIC_ICON_SIZE} network={network} />
              </div>
            )}
          </div>
          {!isBuiltIn && (
            <>
              <div className="input_wrap">
                <SharedInput
                  id="custom_network_name"
                  label={t("name")}
                  value={fields.name}
                  errorMessage={touchedFields.name ? fieldErrors.name : ""}
                  onChange={(value) => updateField("name", value)}
                />
              </div>
              <div className="input_wrap">
                <SharedInput
                  id="custom_network_currency_name"
                  label={t("currencyName")}
                  value={fields.currencyName}
                  errorMessage={
                    touchedFields.currencyName ? fieldErrors.currencyName : ""
                  }
                  onChange={(value) => updateField("currencyName", value)}
                />
              </div>
              <div className="input_wrap">
                <SharedInput
                  id="custom_network_currency_symbol"
                  label={t("currencySymbol")}
                  value={fields.currencySymbol}
                  errorMessage={
                    touchedFields.currencySymbol
                      ? fieldErrors.currencySymbol
                      : ""
                  }
                  onChange={(value) => updateField("currencySymbol", value)}
                />
              </div>
              <div className="input_wrap">
                <SharedInput
                  id="custom_network_currency_decimals"
                  type="number"
                  label={t("currencyDecimals")}
                  value={fields.currencyDecimals}
                  errorMessage={
                    touchedFields.currencyDecimals
                      ? fieldErrors.currencyDecimals
                      : ""
                  }
                  onChange={(value) => updateField("currencyDecimals", value)}
                />
              </div>
            </>
          )}
          {/* Editable for every network, built-in included. */}
          <div className="input_wrap">
            <SharedInput
              id="custom_network_block_explorer_url"
              label={t("blockExplorerUrl")}
              value={fields.blockExplorerUrl}
              errorMessage={
                touchedFields.blockExplorerUrl
                  ? fieldErrors.blockExplorerUrl
                  : ""
              }
              onChange={(value) => updateField("blockExplorerUrl", value)}
            />
          </div>
          {!isBuiltIn && (
            <div className="icon_field">
              <div className="icon_preview">
                {hasIconPreview ? (
                  <img
                    src={trimmedIconUrl}
                    alt={t("iconPreviewAlt")}
                    width={ICON_PREVIEW_SIZE}
                    height={ICON_PREVIEW_SIZE}
                    onError={() => setIsIconBroken(true)}
                  />
                ) : (
                  <SharedNetworkIcon
                    size={ICON_PREVIEW_SIZE}
                    network={network}
                  />
                )}
              </div>
              <div className="input_wrap">
                <SharedInput
                  id="custom_network_icon_url"
                  label={t("iconUrl")}
                  value={fields.iconUrl}
                  errorMessage={
                    touchedFields.iconUrl ? fieldErrors.iconUrl : ""
                  }
                  onChange={(value) => updateField("iconUrl", value)}
                />
              </div>
            </div>
          )}
          <div className="rpc_urls">
            <div className="rpc_urls_header">
              <h4>{t("rpcUrlsTitle")}</h4>
              <span className="rpc_urls_hint">{t("rpcUrlsHint")}</span>
            </div>
            {managedEndpointRows.length > 0 && (
              <div className="managed_endpoints">
                <span className="rpc_urls_hint">{t("managedRpcUrlsHint")}</span>
                {managedEndpointRows.map(({ origin, hasAlchemyApis }) => (
                  <div className="managed_endpoint_row" key={origin}>
                    <span className="managed_endpoint_origin" title={origin}>
                      {origin}
                    </span>
                    <span className="network_tag">{t("managedTag")}</span>
                    {hasAlchemyApis && (
                      <span className="managed_endpoint_capability">
                        {t("alchemyApis")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {rpcEndpointRows === null ? (
              <span className="rpc_urls_hint">{t("loading")}</span>
            ) : (
              rpcEndpointRows.map((row, index) => (
                <div className="rpc_url_row" key={row.id}>
                  <div className="rpc_url_fields">
                    <div className="input_wrap">
                      <SharedInput
                        id={`custom_network_rpc_url_${row.id}`}
                        label={t("rpcUrl", { index: index + 1 })}
                        value={row.url}
                        errorMessage={
                          row.isTouched ? rpcUrlErrors.get(row.id) ?? "" : ""
                        }
                        onChange={(value) =>
                          updateRpcEndpointUrl(row.id, value)
                        }
                      />
                    </div>
                    <div className="alchemy_toggle">
                      <SharedCheckbox
                        label={t("alchemyApis")}
                        size={14}
                        checked={row.hasAlchemyApis}
                        stylesForLabel={{
                          fontSize: "14px",
                          lineHeight: "20px",
                        }}
                        onChange={(value) =>
                          updateRpcEndpointAlchemyApis(row.id, value)
                        }
                      />
                      <SharedTooltip width={190} style={{ marginLeft: 4 }}>
                        {t("alchemyApisHint")}
                      </SharedTooltip>
                    </div>
                  </div>
                  <SharedIcon
                    width={16}
                    icon="icons/s/garbage.svg"
                    color="var(--green-40)"
                    hoverColor="var(--error)"
                    ariaLabel={t("removeRpcUrl")}
                    disabled={rpcEndpointRows.length <= 1}
                    onClick={() => removeRpcEndpointRow(row.id)}
                  />
                </div>
              ))
            )}
            <div>
              <SharedButton
                type="tertiary"
                size="small"
                iconSmall="add"
                onClick={addRpcEndpointRow}
              >
                {t("addRpcUrl")}
              </SharedButton>
            </div>
          </div>
          <div className="form_controls">
            {saveError !== "" && (
              <span className="save_error" role="alert">
                {saveError}
              </span>
            )}
            <SharedButton
              type="primary"
              size="medium"
              isFormSubmit
              isDisabled={!isFormValid || isSaving}
              isLoading={isSaving}
            >
              {t("save")}
            </SharedButton>
          </div>
        </form>
        <style jsx>{`
          /*
         * The form body, rather than the hosting slide-up, does the scrolling:
         * that keeps the panel header (and the slide-up's close button) in
         * place while the fields move under them.
         */
          .edit_network {
            display: flex;
            flex-direction: column;
            max-height: calc(${MENU_HEIGHT_VH}vh - ${MENU_CHROME_HEIGHT}px);
            overflow-y: auto;
            padding: 0 24px 24px;
            box-sizing: border-box;
          }

          h4 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            line-height: 24px;
            letter-spacing: 0em;
          }

          form {
            all: unset;
            max-width: 100%;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 32px;
          }

          .input_wrap {
            position: relative;
            flex-grow: 1;
          }

          .static_rows {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .static_row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 8px;
          }

          .static_label {
            font-size: 14px;
            font-weight: 500;
            line-height: 16px;
            letter-spacing: 0.03em;
            color: var(--green-40);
          }

          .static_value {
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            letter-spacing: 0em;
            color: var(--white);
            word-break: break-all;
            text-align: right;
          }

          .icon_field {
            display: flex;
            gap: 16px;
            align-items: center;
          }

          .icon_preview {
            width: ${ICON_PREVIEW_SIZE}px;
            height: ${ICON_PREVIEW_SIZE}px;
            flex-shrink: 0;
            border-radius: 4px;
            overflow: hidden;
          }

          .icon_preview img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            object-position: center;
          }

          .rpc_urls {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .rpc_urls_header {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .rpc_urls_hint {
            font-size: 14px;
            font-weight: 500;
            line-height: 20px;
            letter-spacing: 0.03em;
            color: var(--green-40);
          }

          .rpc_url_row {
            display: flex;
            gap: 12px;
            align-items: center;
          }

          .rpc_url_fields {
            display: flex;
            flex-direction: column;
            gap: 8px;
            flex-grow: 1;
            min-width: 0;
          }

          .alchemy_toggle {
            display: flex;
            align-items: center;
          }

          .managed_endpoints {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .managed_endpoint_row {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
          }

          /* Only the origin is shown; the full URL carries an access key. */
          .managed_endpoint_origin {
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            letter-spacing: 0em;
            color: var(--green-20);
            overflow-x: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .network_tag {
            flex-shrink: 0;
            padding: 2px 8px;
            border-radius: 4px;
            background: var(--green-120);
            color: var(--green-40);
            font-size: 12px;
            font-weight: 500;
            line-height: 16px;
            letter-spacing: 0.03em;
          }

          .managed_endpoint_capability {
            flex-shrink: 0;
            font-size: 14px;
            font-weight: 500;
            line-height: 20px;
            letter-spacing: 0.03em;
            color: var(--green-40);
          }

          .form_controls {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
          }

          .save_error {
            width: 100%;
            text-align: left;
            font-size: 14px;
            font-weight: 500;
            line-height: 20px;
            letter-spacing: 0.03em;
            color: var(--error);
            word-break: break-word;
          }
        `}</style>
      </div>
    </SharedSlideUpMenuPanel>
  )
}
