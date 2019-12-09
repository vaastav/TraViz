import axios from "axios";
const API_URL = "http://198.162.52.119:9000"

class AggregateService {
    async getAggregate(traces) {
        const url = `${API_URL}/aggregate`;
        return axios.get(url, {
            params: {
                traces: traces.join(',')
            }
        }).then(response => response.data)
    }
}

export default AggregateService
