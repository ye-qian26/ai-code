import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export const formatTime = (time, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!time) return ''
  return dayjs(time).format(format)
}

export const formatRelativeTime = (time) => {
  if (!time) return ''
  return dayjs(time).fromNow()
}

export const formatDate = (time) => {
  if (!time) return ''
  return dayjs(time).format('YYYY-MM-DD')
}