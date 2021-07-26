// import { alarms } from '../../../lib/alarms'


// export default class Poller extends EventEmitter {
//   constructor ({ alarmName, periodInMinutes, method }) {
//     this.time = time //|| figure out the time based on seconds?
//     this.method = method
//     this.ready = new Promise((resolve, reject) => {
//       this.isReady = resolve
//     })
//     alarms.get(alarmName)
//     .then((alarm) => {
//       if (alarm) {
//         return this.isReady()
//       } else {
//         alarms.create(alarmName, {
//           periodInMinutes
//         })
//       }

//     })
//   }

//   async start () {
//     await this.ready
//   }

//   stop () {

//   }

//   _handler () {

//   }
// }
