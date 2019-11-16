import React from "react";
import {Row, Col} from "react-flexbox-grid";
import { SourceTable } from "./sourceTable";
import { SourceContext } from "./srcContext";

export const SourceDashboard = (props)=> {
    return (
        <div>
            <SourceContext>
            <Row>
                <Col md={6} >
                    <SourceTable />
                </Col>
            </Row>
            </SourceContext>
        </div>
    )
}