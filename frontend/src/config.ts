
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const REST_ENDPOINT = API_URL;
export const WS_ENDPOINT = API_URL.replace(/^http/, 'ws');