/* eslint-disable import/prefer-default-export */
import {
  EnrichedAvailableVault,
  selectAvailableVaults,
  selectIsVaultDataStale,
  updateVaults,
} from "@tallyho/tally-background/redux-slices/earn"
import { useCallback, useEffect, useState } from "react"
import { useBackgroundSelector, useBackgroundDispatch } from "./redux-hooks"

export const useAllEarnVaults = (): EnrichedAvailableVault[] => {
  const dispatch = useBackgroundDispatch()
  const availableVaults = useBackgroundSelector(selectAvailableVaults)
  const [vaults, setVaults] = useState(
    availableVaults as EnrichedAvailableVault[],
  )
  const isValutDataStale = useBackgroundSelector(selectIsVaultDataStale)

  const update = useCallback(async () => {
    if (isValutDataStale) {
      const updatedVaults = (await dispatch(
        updateVaults(availableVaults),
      )) as unknown as EnrichedAvailableVault[]
      setVaults(updatedVaults)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isValutDataStale])

  useEffect(() => {
    update()
  }, [update])

  return vaults
}
