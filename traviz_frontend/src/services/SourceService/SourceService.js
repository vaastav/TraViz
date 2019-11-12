import axios from "axios";
const API_URL = "http://198.162.52.119:9000"

class SourceService {
    async getSource() {
        const url = `${API_URL}/source`;
        return axios.get(url, {headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }})
          .then(response => response.data);
    }
}

export default SourceService