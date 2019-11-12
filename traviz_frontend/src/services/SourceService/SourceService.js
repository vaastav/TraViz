import axios from "axios";
const API_URL = "198.162.52.119:9000"

class SourceService {
    async getSource() {
        const url = `${API_URL}/source`;
        console.log("Inside get source!");
        return axios.get(url).then(response => {
            console.log("response")
            response.data
        })
    }
}

export default SourceService