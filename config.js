const API_URL = window.location.hostname === 'morning-taiga-69885-23caee796dab.herokuapp.com'
  ? 'https://morning-taiga-69885-23caee796dab.herokuapp.com/api/takmicari'
  : 'http://localhost:3000/api/takmicari';

export default API_URL;