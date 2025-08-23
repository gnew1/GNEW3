import React from "react"; 
import { createRoot } from "react-dom/client"; 
import DelegationCard from "./components/DelegationCard"; 
 
const CONTRACT = import.meta.env.VITE_DELEGATION_ADDRESS as string; 
 
createRoot(document.getElementById("root")!).render( 
  <React.StrictMode> 
    <div style={{ display: "flex", justifyContent: "center", 
marginTop: 40 }}> 
      <DelegationCard contractAddress={CONTRACT} 
scopeLabel="TOKEN_VOTES" /> 
    </div> 
  </React.StrictMode> 
); 
 
