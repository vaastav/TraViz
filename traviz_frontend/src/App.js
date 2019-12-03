import React from 'react';
import './App.css';
import Header from './components/Header/Header';
import Main from './components/Main/Main';
import { Helmet } from "react-helmet"

function App() {
  return (
    <div className="App">
      <Helmet>
        <style>{"body { background-color: #1a1a1d; color: white }"}</style>
      </Helmet>
      <Header />
      <Main />
    </div>
  );
}

export default App;
