import { HashRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<div><h1>Listening Lab</h1></div>} />
      </Routes>
    </HashRouter>
  );
}

export default App;
