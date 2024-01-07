import axios from 'axios'
import { showAlert } from './alerts'

/* Type is either password or data */
export const updateSettings = async (data, type) => {

    try {
        const url = type === 'password' ? '/api/v1/users/updateMyPassword' : '/api/v1/users/updateMe'

        /* Try to update datam with the given name and email */
        const res = await axios({
            method: 'PATCH',
            url,
            data,
            headers: {
                'Content-Type': 'application/json'
        }})

        if (res.data.status === 'success') {
            showAlert('success', `${type.toUpperCase()} updated successfully`)
        }
    }

   catch (err) {
     showAlert('error', err.response.data.message)
   }
}