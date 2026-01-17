import axiosClient from '../lib/axiosClient.js'


export const signupApi = (payload)=> axiosClient.post('/auth/signup', payload)
export const loginApi = (payload)=> axiosClient.post('/auth/login', payload)
export const logoutApi = ()=> axiosClient.post('/auth/logout')
export const meApi = ()=> axiosClient.get('/auth/me')


