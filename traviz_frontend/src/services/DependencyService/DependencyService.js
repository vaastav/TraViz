import axios from "axios";
const API_URL = "http://198.162.52.119:9000"

class DependencyService {
    async getDependency() {
        const url = `${API_URL}/dependency`;
        return axios.get(url).then(response => response.data);
    }
}

export default DependencyService
