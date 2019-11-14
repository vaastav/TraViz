import axios from "axios";
const API_URL = "http://198.162.52.119:9000"

class TraceService {
    async getAllTraces() {
        const url = `${API_URL}/overview`;
        return axios.get(url).then(response => {
            return response.data;
        })
    }

    async getTrace(id) {
        const url = `${API_URL}/traces/${id}`;
        return axios.get(url).then(response => response.data);
    }
}

export default TraceService
