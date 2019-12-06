import React from 'react'
import { Grid, Row, Col } from 'react-flexbox-grid'
import { TraceTable } from "./traceTable";
import { DataContext } from "./cxContext";
import { EventsChart } from './eventsChart';
import { DurationChart } from './durationChart';
import { DateChart } from './dateChart';
import { SearchForm } from '../components/SearchForm/SearchForm';
import { Table } from '../components/Table/Table';

export const DashboardCopy = (props) => {

    return (
        <div>
            <DataContext>
                <Row>
                    <Col >
                        <SearchForm />
                    </Col>
                </Row>
            </DataContext>
        </div>
    )
}
