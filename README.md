## Setup ##

### Global Dependencies

Install

* [node.js](http://nodejs.org)
* [GitHub Client](http://mac.github.com/) (with Git Terminal option)
* [Safari](http://www.apple.com/safari/)

and then open Terminal:

    $ sudo npm install -g grunt-cli

### Project Setup

    $ git clone https://github.com/ForceDotComLabs/paper-account-editor.git
    $ cd paper-account-editor
    $ npm install
    $ bower install

To build the project and fetch all the dependencies, execute:

    $ grunt

To build the project for distribution, execute (all assets will be generated in dist directory):

    $ grunt dist

To run the sample app in Safari:

```
1. Open index.html in an editor
2. At line 55, plug in the salesforce session Id. You can use salesforce debugshell to get the session Id.
3. At line 56, plug in the instance url of the org. Eg. https://na1.salesforce.com
4. Open index.html in Safari and you should be able to browse a simple list and detail of an account.
```

Obtaining salesforce session Id for running the sample app:

```
1. Login into salesforce using your web browser.
2. Open the salesforce API debugshell by going to https://<your org instance url>/soap/ajax/30.0/debugshell.html
3. In debugshell, run the following command to obtain the session ID: sforce.connection.sessionId
```

## License ##
Copyright (c) 2014, salesforce.com, inc. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

- Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
- Neither the name of salesforce.com, inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
