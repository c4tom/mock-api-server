/**
 * GraphQL Client Example
 * 
 * This example demonstrates how to interact with the Mock API Server's GraphQL endpoint
 * using Node.js and the fetch API.
 */

// Simple GraphQL client function
async function graphqlRequest(url, query, variables = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Add authentication token if provided
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const result = await response.json();

  if (result.errors) {
    console.error('GraphQL Errors:', result.errors);
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

// Configuration
const GRAPHQL_URL = 'http://localhost:3000/graphql';
const AUTH_TOKEN = 'dev-12345'; // Use your dev token or JWT

// Example 1: Simple Query
async function exampleSimpleQuery() {
  console.log('\n=== Example 1: Simple Query ===');

  const query = `
    query {
      hello
    }
  `;

  const data = await graphqlRequest(GRAPHQL_URL, query);
  console.log('Result:', data);
}

// Example 2: Query with Variables
async function exampleQueryWithVariables() {
  console.log('\n=== Example 2: Query with Variables ===');

  const query = `
    query GetUser($userId: ID!) {
      user(id: $userId) {
        id
        name
        email
      }
    }
  `;

  const variables = {
    userId: '1',
  };

  const data = await graphqlRequest(GRAPHQL_URL, query, variables);
  console.log('User:', data.user);
}

// Example 3: Query with Nested Data
async function exampleNestedQuery() {
  console.log('\n=== Example 3: Query with Nested Data ===');

  const query = `
    query GetUserWithPosts($userId: ID!) {
      user(id: $userId) {
        id
        name
        email
        posts {
          id
          title
          content
        }
      }
    }
  `;

  const variables = {
    userId: '1',
  };

  const data = await graphqlRequest(GRAPHQL_URL, query, variables);
  console.log('User with posts:', JSON.stringify(data.user, null, 2));
}

// Example 4: Get All Users
async function exampleGetAllUsers() {
  console.log('\n=== Example 4: Get All Users ===');

  const query = `
    query {
      users {
        id
        name
        email
      }
    }
  `;

  const data = await graphqlRequest(GRAPHQL_URL, query);
  console.log('Users:', data.users);
}

// Example 5: Get All Posts with Authors
async function exampleGetPostsWithAuthors() {
  console.log('\n=== Example 5: Get All Posts with Authors ===');

  const query = `
    query {
      posts {
        id
        title
        content
        user {
          id
          name
          email
        }
      }
    }
  `;

  const data = await graphqlRequest(GRAPHQL_URL, query);
  console.log('Posts with authors:', JSON.stringify(data.posts, null, 2));
}

// Example 6: Create User Mutation
async function exampleCreateUser() {
  console.log('\n=== Example 6: Create User Mutation ===');

  const mutation = `
    mutation CreateUser($name: String!, $email: String!) {
      createUser(name: $name, email: $email) {
        id
        name
        email
      }
    }
  `;

  const variables = {
    name: 'Alice Johnson',
    email: 'alice@example.com',
  };

  const data = await graphqlRequest(GRAPHQL_URL, mutation, variables);
  console.log('Created user:', data.createUser);
  return data.createUser.id;
}

// Example 7: Update User Mutation
async function exampleUpdateUser(userId) {
  console.log('\n=== Example 7: Update User Mutation ===');

  const mutation = `
    mutation UpdateUser($id: ID!, $name: String, $email: String) {
      updateUser(id: $id, name: $name, email: $email) {
        id
        name
        email
      }
    }
  `;

  const variables = {
    id: userId,
    name: 'Alice Smith',
    email: 'alice.smith@example.com',
  };

  const data = await graphqlRequest(GRAPHQL_URL, mutation, variables);
  console.log('Updated user:', data.updateUser);
}

// Example 8: Create Post Mutation
async function exampleCreatePost(userId) {
  console.log('\n=== Example 8: Create Post Mutation ===');

  const mutation = `
    mutation CreatePost($title: String!, $content: String!, $userId: ID!) {
      createPost(title: $title, content: $content, userId: $userId) {
        id
        title
        content
        user {
          name
        }
      }
    }
  `;

  const variables = {
    title: 'My GraphQL Journey',
    content: 'Learning GraphQL has been an amazing experience!',
    userId: userId,
  };

  const data = await graphqlRequest(GRAPHQL_URL, mutation, variables);
  console.log('Created post:', data.createPost);
  return data.createPost.id;
}

// Example 9: Update Post Mutation
async function exampleUpdatePost(postId) {
  console.log('\n=== Example 9: Update Post Mutation ===');

  const mutation = `
    mutation UpdatePost($id: ID!, $title: String, $content: String) {
      updatePost(id: $id, title: $title, content: $content) {
        id
        title
        content
      }
    }
  `;

  const variables = {
    id: postId,
    title: 'My Updated GraphQL Journey',
    content: 'Learning GraphQL has been an incredible experience!',
  };

  const data = await graphqlRequest(GRAPHQL_URL, mutation, variables);
  console.log('Updated post:', data.updatePost);
}

// Example 10: Delete Post Mutation
async function exampleDeletePost(postId) {
  console.log('\n=== Example 10: Delete Post Mutation ===');

  const mutation = `
    mutation DeletePost($id: ID!) {
      deletePost(id: $id)
    }
  `;

  const variables = {
    id: postId,
  };

  const data = await graphqlRequest(GRAPHQL_URL, mutation, variables);
  console.log('Post deleted:', data.deletePost);
}

// Example 11: Delete User Mutation
async function exampleDeleteUser(userId) {
  console.log('\n=== Example 11: Delete User Mutation ===');

  const mutation = `
    mutation DeleteUser($id: ID!) {
      deleteUser(id: $id)
    }
  `;

  const variables = {
    id: userId,
  };

  const data = await graphqlRequest(GRAPHQL_URL, mutation, variables);
  console.log('User deleted:', data.deleteUser);
}

// Example 12: Error Handling
async function exampleErrorHandling() {
  console.log('\n=== Example 12: Error Handling ===');

  try {
    const query = `
      query {
        user(id: "999999") {
          id
          name
          email
        }
      }
    `;

    const data = await graphqlRequest(GRAPHQL_URL, query);
    console.log('User:', data.user || 'Not found');
  } catch (error) {
    console.error('Error occurred:', error.message);
  }
}

// Example 13: Batch Queries
async function exampleBatchQueries() {
  console.log('\n=== Example 13: Batch Queries ===');

  const query = `
    query {
      users {
        id
        name
      }
      posts {
        id
        title
      }
    }
  `;

  const data = await graphqlRequest(GRAPHQL_URL, query);
  console.log('Users count:', data.users.length);
  console.log('Posts count:', data.posts.length);
}

// Example 14: Using Fragments
async function exampleFragments() {
  console.log('\n=== Example 14: Using Fragments ===');

  const query = `
    fragment UserFields on User {
      id
      name
      email
    }

    query {
      users {
        ...UserFields
      }
    }
  `;

  const data = await graphqlRequest(GRAPHQL_URL, query);
  console.log('Users:', data.users);
}

// Example 15: Authenticated Request
async function exampleAuthenticatedRequest() {
  console.log('\n=== Example 15: Authenticated Request ===');

  const query = `
    query {
      users {
        id
        name
        email
      }
    }
  `;

  // Pass authentication token
  const data = await graphqlRequest(GRAPHQL_URL, query, {}, AUTH_TOKEN);
  console.log('Users (authenticated):', data.users);
}

// Run all examples
async function runAllExamples() {
  try {
    console.log('Starting GraphQL Client Examples...');
    console.log('Make sure the Mock API Server is running on http://localhost:3000');

    // Query examples
    await exampleSimpleQuery();
    await exampleQueryWithVariables();
    await exampleGetAllUsers();
    await exampleGetPostsWithAuthors();
    await exampleNestedQuery();
    await exampleBatchQueries();
    await exampleFragments();

    // Mutation examples
    const newUserId = await exampleCreateUser();
    await exampleUpdateUser(newUserId);

    const newPostId = await exampleCreatePost(newUserId);
    await exampleUpdatePost(newPostId);
    await exampleDeletePost(newPostId);
    await exampleDeleteUser(newUserId);

    // Error handling
    await exampleErrorHandling();

    // Authentication
    await exampleAuthenticatedRequest();

    console.log('\n=== All Examples Completed Successfully! ===');
  } catch (error) {
    console.error('\nError running examples:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

// Export functions for use in other modules
module.exports = {
  graphqlRequest,
  exampleSimpleQuery,
  exampleQueryWithVariables,
  exampleNestedQuery,
  exampleGetAllUsers,
  exampleGetPostsWithAuthors,
  exampleCreateUser,
  exampleUpdateUser,
  exampleCreatePost,
  exampleUpdatePost,
  exampleDeletePost,
  exampleDeleteUser,
  exampleErrorHandling,
  exampleBatchQueries,
  exampleFragments,
  exampleAuthenticatedRequest,
};
