
# auto-generator-protonvpn
 
# how to install and use?

    git clone https://github.com/hack-tramp/autoprotonvpn.git
    cd autoprotonvpn
    npm install
    node proton.js

# What is it?
Just run the NodeJS file and it will create a new ProtonVPN account, with a random username and password

# How does it work?
This script uses disposable email from generator.email, and headless browser  
to fill out the registration form, receive the verification email at the disposable address,  
and complete the registration process.