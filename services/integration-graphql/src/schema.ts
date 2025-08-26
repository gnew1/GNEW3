import gql from "graphql-tag"; 
 
export const typeDefs = gql/* GraphQL */ ` 
  schema @apiVersion(version: "1") { 
    query: Query 
    mutation: Mutation 
  } 
 
  directive @apiVersion(version: String!) on SCHEMA 
 
  type Query { 
    ping: Boolean! 
    projects: [Project!]! 
    rewards(user: String!): Rewards! 
  } 
 
  type Mutation { 
    stake(amount: Int!): StakeResult! 
  } 
 
  type Project { 
    id: ID! 
    title: String! 
    status: String! 
  } 
 
  type Rewards { 
    user: String! 
    rewards: Int! 
  } 
 
  type StakeResult { 
status: String! 
txId: String 
} 
`; 
