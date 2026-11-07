import React, { ReactElement, ReactNode, useEffect, useRef } from "react"

type Props = {
  title: string
  searchPlaceholder: string
  onSearchChange: (term: string) => void
  onSearchKeyDown?: (event: React.KeyboardEvent) => void
  /** The list, or whatever stands in for it, such as an empty state. */
  children: ReactNode
}

/**
 * A title, a search box, and a list below them that fills the rest of its
 * container, for slide-ups like the network and address selectors.
 *
 * Only the list scrolls. The container shouldn't scroll too: if it does,
 * scrolling past the end of the list moves on to the container and carries
 * the search box away with it.
 */
export default function SharedSearchableList({
  title,
  searchPlaceholder,
  onSearchChange,
  onSearchKeyDown,
  children,
}: Props): ReactElement {
  const searchInput = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    searchInput.current?.focus()
  }, [])

  return (
    <div className="searchable_list">
      <div className="standard_width_padded center_horizontal">
        <div className="title">{title}</div>
        <div className="search_wrap">
          <input
            type="text"
            ref={searchInput}
            className="search_input"
            placeholder={searchPlaceholder}
            spellCheck={false}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={onSearchKeyDown}
          />
          <span className="icon_search" />
        </div>
      </div>
      <div className="divider" />
      <div className="list_region">{children}</div>
      <style jsx>{`
        .searchable_list {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }
        .title {
          height: 20px;
          color: var(--green-60);
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          margin-bottom: 16px;
          margin-top: -5px;
        }
        .search_wrap {
          display: flex;
          position: relative;
        }
        .search_input {
          width: 100%;
          height: 48px;
          border-radius: 4px;
          border: 1px solid var(--green-60);
          padding-left: 16px;
          padding-right: 56px;
          box-sizing: border-box;
          color: var(--green-40);
          background: transparent;
        }
        .search_input::placeholder {
          color: var(--green-40);
        }
        :global([data-theme="light"]) .icon_search {
          background: var(--green-40);
          mask: url("./images/search_large@2x.png") center / 24px 24px no-repeat;
        }
        .icon_search {
          background: url("./images/search_large@2x.png");
          background-size: 24px 24px;
          width: 24px;
          height: 24px;
          position: absolute;
          right: 16px;
          top: 12px;
        }
        .divider {
          flex-shrink: 0;
          width: 100%;
          height: 0;
          border-bottom: 1px solid var(--hunter-green);
          margin-top: 15px;
        }
        .list_region {
          /* Exactly the space the header leaves, so nothing else scrolls. */
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          padding: 16px 24px;
          box-sizing: border-box;
        }
      `}</style>
    </div>
  )
}
