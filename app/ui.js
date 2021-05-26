import  { connectToBackgroundApi } from './extension-scripts/lib/connect'

const background = connectToBackgroundApi({ name: 'ui' })

test()

async function test () {
  let test = background.send({
    route: '/test',
    method: 'GET',
  })
  console.log(test)
  test = await background.send({
    route: '/test',
    method: 'PUT',
    params: {value: 2},
  })
  console.log(test)
}
