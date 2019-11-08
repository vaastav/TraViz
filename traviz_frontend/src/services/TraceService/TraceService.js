import axios from "axios";
const API_URL = "https://stuffthingstuff.com"

class TraceService {
    async getAllTraces() {
        const url = `${API_URL}/traces/`;
        return axios.get(url).then(response => response.data)
    }

    async getTrace(id) {
        const url = `${API_URL}/traces/${id}`;
        return axios.get(url).then(response => response.data);
    }
}

export default TraceService