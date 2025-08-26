#!/usr/bin/env node 
import "dotenv/config";
import { argv } from "process";
console.log(`GNEW Treasury CLI 
Commands: 
propose:eth   Proponer transferencia de ETH 
propose:erc20 Proponer transferencia de ERC20 
Use npm run or npx gnew-treasury <command> --help 
Args passed:`, argv.slice(2).join(" "));
