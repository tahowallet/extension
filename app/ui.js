import  { connectToBackgroundApi } from './extension-scripts/lib/connect'

const background = connectToBackgroundApi({ name: 'ui' })

function async test () {
  let test = background.send({
    route: '/test',
    method: 'GET',
  })
  console.log(test)
  test = await background.send({
    route: '/test',
    method: 'PUT',
    params: [2],
  })
  console.log(test)
}

test()