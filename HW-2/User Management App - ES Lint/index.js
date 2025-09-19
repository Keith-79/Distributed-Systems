const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = 8080;

//set the view engine to ejs
app.set('view engine', 'ejs');

//set the directory of views
app.set('views', './views');

//specify the path of static directory
const path = require('path')

app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// User Data
let users = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" }
];

//route to root
app.get('/', function (req, res) {
        res.render('home', {
            users: users
        });
});

//route to create user
app.get('/create', function (req, res) {
    res.render('create');
});

// add new user
app.post('/add-user', (req, res) => {
    const { name } = req.body;
    if (!name.trim()) {
        return res.status(400).send('User name is required');
    }
    const newUser = { id: users.length + 1, name };
    users.push(newUser);
    res.redirect('/');  // Redirect to home page to show updated list
});


//route to update user
app.get('/update', function (req, res) {
    res.render('update');
});

// update user
app.post('/update-user', (req, res) => {
    const { id, name } = req.body;
    
    // Convert id to an integer
    const userId = parseInt(id, 10);
    
    console.log(`Received ID: ${id}, Converted ID: ${userId}, Name: ${name}`);
    
    // Find the user
    const user = users.find(user => user.id === userId);
    
    if (!user) {
        console.log("User not found!");
        return res.status(404).send('User not found');
    }

    // Update the user's name
    user.name = name;
    console.log(`User updated: ${JSON.stringify(user)}`);

    res.redirect('/');  // Redirect to home page with updated users list
});


//route to delete user
app.get('/delete', function (req, res) {
    res.render('delete');
});

// Delete user
app.post('/delete-user', (req, res) => {
    const { id } = req.body;
    
    // Convert ID to a number
    const userId = parseInt(id, 10);
    
    console.log(`Received ID for deletion: ${userId}`);

    // Find the index of the user
    const userIndex = users.findIndex(user => user.id === userId);

    if (userIndex === -1) {
        console.log("User not found!");
        return res.status(404).send('User not found');
    }

    // Remove the user from the array
    users.splice(userIndex, 1);
    
    console.log(`User with ID ${userId} deleted successfully.`);
    
    res.redirect('/'); // Redirect to home page with updated users list
});

// Start the server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));