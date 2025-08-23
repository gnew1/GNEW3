import React from "react"; 
import { BrowserRouter, Link, Route, Routes } from "react-router-dom"; 
import ProposalForm from "./components/ProposalForm"; 
import ProposalsList from "./components/ProposalsList"; 
import ProposalDetail from "./pages/ProposalDetail"; 
 
export default function App() { 
  return ( 
    <BrowserRouter> 
      <div className="max-w-4xl mx-auto p-4 grid gap-6"> 
        <header className="flex items-center justify-between"> 
          <Link to="/" className="font-semibold">GNEW — 
Gobernanza</Link> 
          <Link to="/new" className="px-3 py-2 rounded bg-black 
text-white">Nueva propuesta</Link> 
        </header> 
        <Routes> 
          <Route path="/" element={<ProposalsList />} /> 
          <Route path="/new" element={<ProposalForm />} /> 
          <Route path="/proposal/:id" element={<ProposalDetail />} /> 
        </Routes> 
      </div> 
    </BrowserRouter> 
  ); 
} 
 
