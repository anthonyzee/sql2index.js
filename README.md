# sql2index.js

sql2index.js is a simple polyfill to enable Web SQL using indexedDB.

## Installation

Download sql2index.js and put it in your web application javascripts directory. Then include it in your document AFTER LawnchairJS (see dependencies for download link).

## Usage

sql2index.js create and open a database object that model Web SQL. Transaction and executeSQL in sql2index are a simplified to allow basic store/put record in indexedDB. Therefore there are limited as below. 

1. transaction and table relation are not supported.
2. sql syntax follows strictly to SQLite syntax (see [http://www.sqlite.org/lang.html](http://www.sqlite.org/lang.html))

Instead of calling 'openDatabase' (Web SQL), just call 'openIndexedDB'.
 
	var conn=openIndexedDB();
	conn.transaction(function(tx){
		tx.executeSql('CREATE TABLE todo (content TEXT, status TEXT)');
	}
	
Inside the 'transaction' function() `tx` is your transaction object. This is where you execute SQL statement.

## Dependencies

sql2index.js requires LawnchairJS.
* Get it from: [http://brian.io/lawnchair/](http://brian.io/lawnchair/)

## License

sql2index is covered by the MIT License. See LICENSE for more information.