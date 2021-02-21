import optionsStorage from './options-storage'

optionsStorage.syncForm('#options-form')

const rangeInputs = [...document.querySelectorAll('input[type="range"][name^="color"]')]
const numberInputs = [...document.querySelectorAll('input[type="number"][name^="color"]')]
const output = document.querySelector('.color-output')

function updateColor() {
  if (output) {
    output.style.backgroundColor = `rgb(${rangeInputs[0].value}, ${rangeInputs[1].value}, ${rangeInputs[2].value})`
  }
}

function updateInputField(event) {
	numberInputs[rangeInputs.indexOf(event.currentTarget)].value = event.currentTarget.value
}

for (const input of rangeInputs) {
	input.addEventListener('input', updateColor)
	input.addEventListener('input', updateInputField)
}

window.addEventListener('load', updateColor)
