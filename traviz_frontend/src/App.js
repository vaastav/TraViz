import React from 'react';
import './App.css';
import Header from './components/Header/Header';
import Main from './components/Main/Main';
import { Helmet } from "react-helmet"

function App() {
  return (
    <div className="App">
      <Helmet>
        <style>{"body { background-color: #030100; color: white; font-family: 'Andale Mono', sans-serif;  }"}</style>
      </Helmet>
      <Header />
      <Main />
    </div>
  );
}

export default App;
