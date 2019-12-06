import React from 'react'
import {Grid,Row,Col} from 'react-flexbox-grid'
import { TraceTable } from "./traceTable";
import { DataContext } from "./cxContext";
import { EventsChart } from './eventsChart';
import { DurationChart } from './durationChart';
import { DateChart } from './dateChart';
import { SearchForm } from '../components/SearchForm/SearchForm';

export const DashboardCopy = (props)=>{

    return(
        <div>
        <DataContext>
                <Row>
                    <Col >
                        <SearchForm/>
                    </Col>
                    <Col md={6} >
                        <TraceTable />
                    </Col>
                    <Col md={6} >
                        <Row>
                            <EventsChart />
                        </Row>
                        <Row>
                            <DurationChart />
                        </Row>
                        <Row>
                            <DateChart />
                        </Row>
                    </Col>
                </Row>
        </DataContext>
        </div>
    )
}
