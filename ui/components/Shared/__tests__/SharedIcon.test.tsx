import React from "react"
import { render } from "@testing-library/react"
import SharedIcon from "../SharedIcon"

describe("SharedIcon", () => {
  describe("as a plain icon", () => {
    it("stays out of the accessibility tree when it carries no meaning", () => {
      // The alternative is an unnamed element for assistive technology to
      // guess at, which is what this used to be.
      const ui = render(<SharedIcon icon="icons/s/continue.svg" width={16} />)

      expect(ui.queryByRole("img")).not.toBeInTheDocument()
    })

    it("announces itself as an image when it is given a name", () => {
      const ui = render(
        <SharedIcon
          icon="icons/s/notif-attention.svg"
          width={16}
          ariaLabel="Network connection problem"
        />,
      )

      expect(ui.getByRole("img")).toHaveAccessibleName(
        "Network connection problem",
      )
    })

    it("does not lend a name to a button it sits inside unasked", () => {
      // A labelled icon's name joins the name of any button around it, which
      // is why the label has to be asked for rather than assumed.
      const ui = render(
        <button type="button">
          Manage networks
          <SharedIcon icon="icons/s/continue.svg" width={16} />
        </button>,
      )

      expect(ui.getByRole("button")).toHaveAccessibleName("Manage networks")
    })

    it("does lend one when asked", () => {
      const ui = render(
        <button type="button">
          Manage networks
          <SharedIcon
            icon="icons/s/notif-attention.svg"
            width={16}
            ariaLabel="unreachable"
          />
        </button>,
      )

      expect(ui.getByRole("button")).toHaveAccessibleName(
        "Manage networks unreachable",
      )
    })
  })

  describe("as a button", () => {
    it("carries its name on the button itself", () => {
      const ui = render(
        <SharedIcon
          icon="icons/s/close.svg"
          width={16}
          ariaLabel="Close"
          onClick={() => {}}
        />,
      )

      expect(ui.getByRole("button")).toHaveAccessibleName("Close")
    })
  })
})
