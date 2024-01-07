import axios from 'axios'
import { showAlert } from './alerts'

export const login = async (email, password) => {
    try {
      /* Try to authenticate using the given email and password */
        const res = await axios({
            method: 'POST',
            url: '/api/v1/users/login',
            data: {
                email,
                password
            }
        })

        /* If they are correct, then take the user to the homepage after 1,5 sec */
        if (res.data.status === 'success') {
          showAlert('success', 'Logged in successfully')
          window.setTimeout(() => {
            location.assign('/')
          }, 1500)
        }

        console.log(res)
    }

   catch (err) {
     showAlert('error', err.response.data.message)
   }

}

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
    })
    /* Reload the page */
    if (res.data.status === 'success') location.reload(true)

  }
  catch(err) {
    showAlert('error', 'Error logging out')
  }
}