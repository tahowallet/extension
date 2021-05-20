import  { connectToBackgroundApi } from './extension-scripts/lib/connect'

const background = connectToBackgroundApi({ name: 'ui' })

function test () {
  background.send({
    route: '/test',
    method: 'PUT',
    params: [1],
  }).then(console.log)



background.send({
  route: '/test',
  method: 'GET',
  params: [],
}).then(console.log)
}

test()