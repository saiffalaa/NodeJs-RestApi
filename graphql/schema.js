const { buildSchema } = require("graphql");

module.exports = buildSchema(`
    type Post{
        _id:ID!
        title:String!
        content:String!
        imageUrl:String!
        creator:User!
        createdAt:String!
        updatedAt:String!
    }
    type User{
        _id:ID!
        name:String!
        email:String!
        password:String
        status:String!
        posts:[Post!]!
    }
    type authData{
        token:String!
        userId:String!
    }
    type returnPost{
        posts:[Post!]!
        totalPosts:Int!
    }
    input PostData{
        title:String!
        content:String!
        imageUrl:String!
    }
    input userData{
        email:String!
        password:String!
        name:String!
    }
    type RootQuery{
        login(email:String!,password:String!): authData!
       getPosts(page:Int!):returnPost!
       post(id: ID!): Post!
       user:User!
    }
   type rootMutation{
       createUser(userInput:userData):User!   
       addPost(post:PostData):Post!
       updatePost(id:ID!,postInput:PostData):Post!
       deletePost(id:ID!):Boolean
       updateStatus(status:String!):User!
   }
    schema {
        query:RootQuery
        mutation:rootMutation
    }
`);
