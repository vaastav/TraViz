import axios from "axios";
const API_URL = "http://198.162.52.119:9000"

class TagService {
    async getAllTags() {
        const url = `${API_URL}/tags`;
        return axios.get(url).then(response => {
            return response.data;
        })
    }
}

export default TagService
