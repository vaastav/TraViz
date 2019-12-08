import axios from "axios"
const API_URL = "http://198.162.52.119:9000"

class CompareService {
    async compareTraces(trace1ID, trace2ID) {
        console.log("Trace IDs: ", trace1ID, trace2ID);
        const url = `${API_URL}/compare/${trace1ID}/${trace2ID}`;
        console.log("URL: ", url);
        return axios.get(url).then(response => {
            return response.data;
        });
    }
}

export default CompareService
