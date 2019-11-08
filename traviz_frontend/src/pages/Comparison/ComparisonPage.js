import React from "react";

class ComparisonPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            traces: {}
        };
    }

    componentDidMount() {
        console.log("Comparison Page");
        console.log(this.props.match.params.number);
    }

    render() {
        return (
            <div>
                <h2>Comparison:</h2>
            </div>
        )
    }
}

export default ComparisonPage;