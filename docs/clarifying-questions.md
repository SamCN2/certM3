# Clarifying Questions for certM3 Implementation


## Unasked questions

1. What crypto should we use
	The most modern that is supported by our libraries and is in general use
		We want to be strong but acceptable in the majority of browsers
		DES and DES3 are not strong enough in 2025.
		Similarly SHA384 for digest seems the right answer.
		Eliptic curves for keypairs seems the right answer.

2.  What should be the design concept for the browser applications:

		Semantic UI with - handlebars templating engine

		all pages should have a "home" button and a "support" button
		all pages should have a 'next' button and 'back' button
		buttons should be activate only when valid data are available
		Home is where our intro and basic user info docs are presented
		Support is a place where our (if any) more detalied docs live, and is a place for eventual links to real support.
		all pages are Copyright 2025 ogt11.com, llc 
		Top level LICENSE file contains the Mozilla Public License v2.0

3.	What code management should we use

		Git, with preparation to push to github.  in the .git is my git info.

## Reverse proxying

1. We use nginx, and have a certm3.conf config file in our top level directory.  This is so we don't have to edit root owned files.  Edit this file, and we'll have a script to sudo cp it to /etc/nginx/sites-enabled/ and test and restart nginx.

2. We want this to be easy to proxy.  The api engine is at location /api/ and the application engine is at /app/.  There will be a location stanza for each of these, and one for /static/ content, like js, css, etc.


## Authentication & Authorization
1. What authentication mechanism should be used for the API endpoints? (JWT, OAuth2, etc.)

	Where we need to maintain an authentication between web forms, issue a JWT on the sending page and consume/verify it on the receiveing page.  This is primarily intended as a rate limit for route paths without web code.  We don't want folks pounding on apis.  perhaps the best answer is to use JWTs (or sessions) to inform that we are part of an accepted flow, and if the JWT isn't present, the route path should redirect to / or produce an empty JSON output (if it is a JSON api endpoint)  Or instead, just refuse to answer if the JWT isn't present.

2. Should we implement role-based access control (RBAC) for the admin interface?

    Yes, a user must pass our nginx certificate check, and the group "C3rtM3_Admin" must be in their list of groups in their SAN

3. How should we handle session management for the web applications?

	Existing versions have not used sessions.  If the required data, from the required source, is not available, we redirect them to the page where those data are collected:
	There's only 3 such pages 1) User name/id request 2) Certificate request 3) Certificate delivery, and actually 2&3 can be the same page.

## Email Validation
1. What should be the format of the validation token?

	A UUID

2. What should be the expiration time for validation tokens?

	One Day.  So put the expiry time in a configuration parameter, and use request DB to track issued times and expiry times

3. Should we implement rate limiting for validation attempts?

	Yes, perhaps a session cookie makes sense here.  Attempts to validate token T from session S may retry, but while session S is valid, an attempt to validate token T from session S2 should fail.  I think.

4. What should be the format of the email validation message?

	Thank you for registering with CertM3.  Your email validation token is:   T
	Return to {BASEURL}/validate/{T} to validate or clidk "here" and here is a link to the validation page.
	While the email message is being delivered, they are left at a page with a "Successful Request" and their ID particulars.  On that page is a form to enter the token and a Validate button.  Also is a Cancel  button which invalidates their request, both in web state, and in the request DB, by marking the rewuest status as "cancelled".  We'll clean up cancelled requests daily via scheduled PGSQL trigger or similar.  This cleanup is out of scope for us now.

## Certificate Generation
1. What should be the default validity period for certificates?

	1 year

2. What are the required CSR fields that should be included?

	So, these are the fields I'm aware of.  All but the CN and E are fixed.

	CN - Common Name
	O - Organization
	OU - Organizational Unit
	L - Locality
	S - State
	C - Country
	E - Email Address

3. What should be the format of the default certificate fields file?

	O = ogt11.com
	OU = certM3
	L = Bethesda
	S = Maryland
	C = US


4. What should be the password requirements for the PKCS#12 file?

	I'd like for the user to get their browser to create a crypto secure password and then store it.
	I'd like for the user to have a passkey memorized that is easy to remember.
	But not all browsers will support this.  I only care about Firefox, but even different versions of Firefox vary in this regard.
	So, 32-64 bits of entropy.  8 chars + 4 numerals, or 3 eight character words, We shouldn't enforce a particular structure, but rather estimate the # bits of entropy

5. Should we implement certificate revocation list (CRL) functionality?

	Yes, via an admin endpoint exposed via a request url.  


	/app/certificate/crl/{fingerprint} to see if a fingerprint is on the crl
	and
	/app/certificate/crl/list to get the entire list.


	If there is a standard format that you are aware of, I'm OK to use that.

## Database
1. Should we implement database migrations for schema changes?

	Yes.  If just for the initial table creation.

2. Do we need to implement connection pooling?

	No, this should be a very simple app with limited connections to the DB.


3. Should we implement database backup/restore functionality?

	Not today.

## Security
1. What rate limiting thresholds should we implement?

	Can we do this in nginx?

	The signing is the resource pig, as the CSR generation is on the browser.
	Let's put a rate of 1 signature per 10s per connection/userid



2. Should we implement IP-based blocking for failed attempts?

	Only if we can do it with nginx.  The app will be behind a reverse proxy

3. What should be the password requirements for user accounts?

	Well, this is a self serve app for generating certificates.  Whatever authenication we require will be via certificate authentication.
	The idea is to encapsulate all of the authentication authorization into the certifcate, so that nginx can determine if you're authentic, and can pass on authorization info to the app, perhaps with nginx regulating who can get to an app by looking at the SAN field for a group name
	SO, there are no apsswords for user accounts.  The password is only for their private key,which never leaves their browser.  We only sign a CSR that has their public key.


4. Should we implement audit logging for sensitive operations?

	Yes.

## User Interface
1. What should be the timeout duration for the certificate request page?

	Very short, just long enough to enter a password and click "generate Certificate"  There's no other data to enter.  Say 5 minutes.


2. What should be the exponential backoff parameters for preventing DoS attacks?

	A doubling of time each request?

3. Should we implement a progress indicator for certificate generation?

	No, it only takes a short while.
	The only thing that should take any time at all is the user's keypair generation.  If that's 4096 bits, then that might take a hot minute, so a progress bar may be a good idea.

4. What should be the format of error messages shown to users?

	Light red (pink) exposed background with dark red text.
	display modal in the browser in an error/message area.

## Deployment
1. What should be the directory structure for the application?

	api/ app/ admin/ should be the three main directories

2. What environment variables need to be configured?

	These are the defaults I am aware of.  Perhaps these are build time or startup time vars, I'm not so sure about putting them in the environment.

	Base_URL	(default:  urp.ogt11.com/)
	Keylength	(default:  2048)
	



3. Should we implement health check endpoints?

	Yes

4. What should be the logging format and level?

	Apps should write to stdout and stderr, and we'll coalesce them into /var/spool/CertM3/{appname}/logs and we'll set up an environment file for pm2 to execute.

## Testing
0. What is the most important thing in testing?

   We should have a script or two that validates all of our route paths with curl.
   We should use it whenever we adjust any nginx configs or route rendering or redirection code.

   We should use node and/or loopback unit testing when straightforward

1. What test coverage percentage should we aim for?

	Percentage is difficule, some very small things are very important.
		We want to test the URL route paths to the underlying apis.
		We want to test
			user creation
			username availability
			csr generation
			csr signing
			certificate wrapping in pkcs12
			crl generation
			api endpoints (perhaps via explorer)

2. Should we implement end-to-end testing?

	Yes

3. What should be the test data strategy?

	Create tuples of {username, display name, email address}, and with the exception of the actual emailing, which we will leave for an eamil processing app,
	we will determine whether an api call of that tuple results in an entry into the request db,
	whether a validation call (via full url or via a submit on the validation page) results in an entry into the users db, and
		whether the application redirects the user to the certificate request page
	whether the certificate request page can validate a CSR that is accepted by the csr signer app, and
		whether the return certificate can be wrapped into a pkcs12 format
	These two browser situations being handled in test by the same js code that we send to the browser

## Monitoring
1. What metrics should we collect?

	time to serve each request
	time to sign a certificate paired with the #bits
	Time a user dwels on each page

2. What alerting thresholds should we set?

	We should log an alert if we have a timeout, otherwise just log stats


3. Should we implement a dashboard for monitoring?

	Not at present, though having a /metrics endpoint would be vaulable so we can plumb prometheus in later

## Documentation
1. Should we generate OpenAPI/Swagger documentation?

	Yes

2. What should be the format of the API documentation?

	OpenAPI

3. Should we create user guides for each application component?

	Yes, one pagers should be sufficient.

## Error Handling
1. What should be the format of error responses?

	Divs that become visible with the error

2. Should we implement custom error types?

	No

3. What should be the logging strategy for errors?

	logg into the logs/error.log files

## Performance
1. What are the expected load requirements?

	One user per minute on average

2. Should we implement caching for frequently accessed data?

	Other than static html and js code, there is no data worthy of cacheing.  The browser can handle it.  Users will come infrequently, perhaps monthly to add groups to their certificate

3. What should be the timeout values for database operations?

	Nothing other than standard.  The database has been pretty performant.

## Integration
1. How should we handle integration with the existing CA system?

	None, this is a standalone system

2. What should be the format of the certificate signing request?

	PEM, unless there is a strong reason for otherwise.

3. How should we handle certificate renewal requests?

	A user should present at the home page or the /revalidate page.  Either one will see that their certificate is expired or within 30 days of expiring, and will redirect them to the cert request page.
	If their certificate has expired, lead them through the email validation page, but giving them their existing email address, and marking thier user record status from active to 'revalidate'  
		If we later impleemtn cleanup, we'll have a process that can set their status as expired, revoked, etc.  A user may still be valid even though their certificate may be reiked (whether due to time or key leakage and subsequent self-reproting)

		Later, we can craft an nginx stanza that will redirect if their certificate is expired.
	
	We should also have a user self-deletion request, which sets their status to 'relenquished' or something like that (and we may need to adjust DB constraints, that's OK) and all of their issued certificates to 'revoked'

Please provide answers to these questions to ensure we implement the system according to your requirements. 
