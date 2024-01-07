import { login, logout } from './login'
import { displayMap } from './mapbox'
import { updateSettings } from './updateSettings'
import { bookTour } from './stripe'

/* DOM elements */
const mapBox = document.getElementById('map')
const loginForm = document.querySelector('.form--login')
const logOutBtn = document.querySelector('.nav__el-logout')
const userDataForm = document.querySelector('.form-user-data')
const userPasswordForm = document.querySelector('.form-user-password')
const bookBtn = document.getElementById('book-tour')

/* DELEGATION */
if (mapBox) {
    const locations = JSON.parse(document.getElementById('map').dataset.locations)
    displayMap(locations)
}

if (loginForm) {
  loginForm.addEventListener('submit', e=> {
    e.preventDefault()

    /* INPUTS */
    const emailValue = document.getElementById('email').value;
    const passwordValue = document.getElementById('password').value;

    login(emailValue, passwordValue)
  })
}
   

if (logOutBtn) logOutBtn.addEventListener('click', logout)

if (userDataForm)
  userDataForm.addEventListener('submit', e => {
    e.preventDefault();

    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);

    updateSettings(form, 'data');
  });


if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', e => {
    e.preventDefault()

    const passwordCurrent = document.getElementById('password-current').value
    const password = document.getElementById('password').value
    const passwordConfirm = document.getElementById('password-confirm').value

    updateSettings({passwordCurrent, password, passwordConfirm}, 'password')

  })
}

if (bookBtn) bookBtn.addEventListener('click', e => {
  e.target.textContent = 'Processing....'
  const { tourId } = e.target.dataset;
  bookTour(tourId);
})