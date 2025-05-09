We are going to create an application described in api-decumentation.md
with the following exceptions:

We will have one loopback4 api app to manage the certificate user request group and user_groups databases.
The database structure is in database-tables.txt

We connect to the database with UNIX sockets, as shown in loopback4 form in database-tables.txt

The file nginx.conf will be our model for reverse proxying.  It will live in /etc/nginx/sites-enabled.d

Our api manager will live in /api
Our request app (username and certificates, new and recurring) will live in /request
And an admin app, manager, will live in /manager

The operation is that a user arrives at /request or /request/username or /request/userid
and fills out a for containing fields for username, display name, and email address.
The system spins on username until the user selects an unused username. The request is stored in the request database in the 'pending' state.

Requests are kept in the request database, and potential userids must be checked against both users and requests database tables.

Then the system "sends an email" via the unbuild proces-email app, and in the interim just writes files with the email vaildation message as a file into /var/spool/certM3/validation.emails/

The user is redirected to the /request/validate page which is also the prefix of the link in the user email validation email message.  From this page, the user enters the validation token (or it is taken from the path of the user's email link) and the link is validated against the request database.  Once found, the user is created in the user database, and the request is marked 'completed'.


When the user successfully validates, and their user record is created, they are re-directed to /request/certificate

As the user is created, the user is placed in the "users" group.  placing a user in a group is an entry in the user_groups database.  Each row in that db associates a user with a group.  this creates a many to many relationship between groups and users.  To find the users in a group G, it's a 'select user,userid from user_groups where group = G;

From there, they enter a password and the js code within the page creates a keypair, wraps the public key and the username as CN and their email address as E into a CSR.  Any required CSR fields are held in the page as non-editable variables.  If there is a mismatch, the user is redirected to re-submit.  there is a timeout and a exponential backoff to prevent dos attacks.

Once they present a proper CSR, the cert is signed with info from the user's request and the user db info that we have in the user and user_group database.  Aside from the default group "users" that everyone is in, any groups that the user is a member of are listed in the v3 SAN fields of the certificate.

Any required fields in the certificate that are not obtained from the db or the validated user request are taken from a default file.

Once the certificate is returned to the user's browser, the browser js code wraps the password protected private key and the certificate into a PKCS12 structure and presents it to the user as a download.

if the user needs to update their certificate, they return to the /request/certificate page.  If they have a certificate signed by our CA, they can get a new one, perhaps with new groups, and we present a checkbox list of their available groups in a list on the requst/certificate page.  if their certificate is expired, reset their request database entry to re-validating, and issue an email challenge as they were a new user, and then the proces is the same as a new user.

