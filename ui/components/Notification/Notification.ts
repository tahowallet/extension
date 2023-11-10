import React, { useCallback } from "react"
import { toggleNotifications } from "@tallyho/tally-background/redux-slices/ui"
import { useDispatch } from "react-redux"
import notificationService from "./notification.service"

const useNotifications = () => {
  const dispatch = useDispatch()

  const requestPermission = useCallback(() => {
    notificationService
      .requestPermission()
      .then((permissionGranted: boolean) => {
        dispatch(toggleNotifications(permissionGranted))
      })
  }, [dispatch])

  const cancelPermission = useCallback(() => {
    notificationService
      .cancelPermission()
      .then((permissionGranted: boolean) => {
        dispatch(toggleNotifications(permissionGranted))
      })
  }, [dispatch])

  return { requestPermission, cancelPermission }
}

export default useNotifications
