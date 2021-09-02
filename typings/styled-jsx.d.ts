import React from "react"

declare module "react" {
  interface StyleHTMLAttributes<T> extends React.HTMLAttributes<T> {
    jsx?: boolean
    global?: boolean
  }
}

// From https://github.com/vercel/styled-jsx/issues/90#issuecomment-318052994
