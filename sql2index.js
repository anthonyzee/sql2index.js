//Name: sql2index.js 
//Description: A polyfill to enable websql using indexedDB
//Author: Anthony Zee
//Version: 0.1-alpha

function openIndexedDB(){
	var conn={
		transaction:function(p_Callback){
			//t - Map to websql "transaction" object
			var t = {
				executeSql:function(p_Sql, p_Args, p_Callback){
					var retObj={
						rows:{
							length:0, 
							item:function(i){
								return this.items[i];
							},
							items:[]
						}
					};					
					var strSql=p_Sql+" ["+p_Args+"]";
					var sqlObj=conn.sql2index(strSql); //parse SQL				
					//Processing SQL syntax to IndexedDB through Lawnchair
					switch (sqlObj.verb.toUpperCase()){
						case "CREATE": return retObj;break;
						case "SELECT": 
							var store = Lawnchair({name:sqlObj.table[0].name}, function(store) {
								var strWhere = conn.getLawnCQuery(sqlObj);
								if (strWhere==''){
									store.all(function(a){
										for (var i=0; i<a.length; i++){
											retObj.rows.items.push(a[i]);
											retObj.rows.length=retObj.rows.items.length;
										}
										p_Callback('',retObj);
									});
								}else{
									store.where(strWhere, function(r){										
										for (var i=0; i<r.length; i++){
											retObj.rows.items.push(r[i]);
											retObj.rows.length=retObj.rows.items.length;
										}
										p_Callback('',retObj);
									});
								}
							});		
							break;
						case "INSERT":
							var store = Lawnchair({name:sqlObj.table[0].name}, function(store) {
								var me = {};
								var value=sqlObj.value[0].value;
								var values=value.split(",");
								eval('me.key="'+values[values.length-1]+'"');
								eval('me.'+sqlObj.table[0].name+'_id="'+values[values.length-1]+'"');
								for (var i=0; i<sqlObj.column.length; i++){
									eval('me.'+sqlObj.table[0].name+'_'+sqlObj.column[i].name+'="'+values[i]+'"');
								}
								store.save(me, function(r){
									console.log(r);
								});		
							});
							break;
						case "DELETE": 
							var store = Lawnchair({name:sqlObj.table[0].name}, function(store) {
								var strWhere = conn.getLawnCQuery(sqlObj);
								if (strWhere==''){
									store.nuke();
								}else{
									store.where(strWhere, function(r){
										for (var i=0; i<r.length; i++){
											store.remove(r[i].key);
										}				
									});			
								};
							});	
							break;
						case "UPDATE": 
							var store = Lawnchair({name:sqlObj.table[0].name}, function(store) {
								var me = {};
								var strWhere = conn.getLawnCQuery(sqlObj);
								store.where(strWhere, function(r){
									// compute set value
									var count=0;				
									for (var i=0; i<sqlObj.set.length; i++){
										if (sqlObj.set[i].expression=="="){
											count++;
										}
									}
									for (var i=0; i<count; i++){
										eval('r.'+sqlObj.table[0].name+"_"+sqlObj.set[i+(i*2)].expression.replace(new RegExp("[`,]",'g'),"")+"="+sqlObj.set[(i+(i*2))+2].expression);
									}					
								});							
							});
							break;
						default: break;
					}		
				}
			};
			p_Callback(t);
		}, //conn.transaction
		sql2index:function(p_SQL){
			//sql2index is a sql parser specifically for persistenceJS
			//sqlparser can be improve using lexer such as https://github.com/forward/sql-parser
			//but for now, this hardcoded sql parser is used
			var testSQL=p_SQL;
			var arrSQL=testSQL.split(" ");
			var sqlObj={};
			var nameType="";
			var nameSection="";
			var activeIndex=0;
			var tableIndex=0;
			var whereIndex=0;
			var setIndex=0;
			sqlObj.column=[];
			sqlObj.table=[];
			sqlObj.where=[];
			sqlObj.set=[];
			sqlObj.value=[];
			sqlObj.valueholder=[];
			sqlObj.limit="";
			
			arrSQL.forEach(function(eSQL){
				function zTrim(p_Word){
					var retWord=p_Word;
					retWord=retWord.replace(/\d+/g,"");
					retWord=retWord.replace("(","");
					retWord=retWord.replace(",","");
					retWord=retWord.replace(")","");
					return retWord;
				}
				if (eSQL!=""){		
					var sqlWord=zTrim(eSQL);	
					switch (sqlWord.toUpperCase()){
						case "NULL": break;
						case "IF": break;
						case "NOT": break;
						case "EXISTS": break;
						case "INSERT": 
							sqlObj.verb=eSQL.replace("/[`]/g",""); 
							console.log("sqlObj.verb="+sqlObj.verb);					
							break;
						case "INTO": 
							nameType="TABLE";
							nameSection="TABLE";				
							break;				
						case "VALUES":
							nameType="VALUE";
							nameSection="VALUE?";
							break;
						case "CREATE": 			 
							sqlObj.verb=eSQL.replace("/[`]/g",""); 
							console.log("sqlObj.verb="+sqlObj.verb);
							nameType="TABLE";
							break;
						case "SELECT":
							sqlObj.verb=eSQL.replace("/[`]/g",""); 
							nameType="COLUMN";
							console.log("sqlObj.verb="+sqlObj.verb);
							break;			
						case "LIMIT":
							nameType="LIMIT";
							break;
						case "DELETE":
							sqlObj.verb=eSQL.replace("/[`]/g",""); 
							console.log("sqlObj.verb="+sqlObj.verb);
							break;
						case "UPDATE":
							sqlObj.verb=eSQL.replace("/[`]/g",""); 
							console.log("sqlObj.verb="+sqlObj.verb);
							nameType="TABLE";		
							break;
						case "AS":
							nameType="PSEUDO";
							break;
						case "TABLE": 
							nameType="TABLE"; 
							break;
						case "FROM":
							nameType="TABLE";
							nameSection="TABLE";
							break;
						case "WHERE":
							nameType="WHERE";
							nameSection="WHERE";
							break;
						case "SET":
							nameType="SET";			
							nameSection="SET";
							break;
						case "TEXT": 
							sqlObj.column[activeIndex].type="TEXT"; 
							console.log("sqlObj.column["+activeIndex+"].type="+sqlObj.column[activeIndex].type); 
							break;
						case "BIGINT":
							sqlObj.column[activeIndex].type="BIGINT"; 
							console.log("sqlObj.column["+activeIndex+"].type="+sqlObj.column[activeIndex].type); 
							break;
						case "INT":
							sqlObj.column[activeIndex].type="INT"; 
							console.log("sqlObj.column["+activeIndex+"].type="+sqlObj.column[activeIndex].type); 
							break;
						case "VARCHAR":
							sqlObj.column[activeIndex].type=eSQL.replace(",",""); 
							console.log("sqlObj.column["+activeIndex+"].type="+sqlObj.column[activeIndex].type); 
							break;		
						case "PRIMARY":
							sqlObj.column[activeIndex].key=true; 
							console.log("sqlObj.column["+activeIndex+"].key="+sqlObj.column[activeIndex].key); 
							break;		
						case "KEY":
							sqlObj.column[activeIndex].key=true; 
							console.log("sqlObj.column["+activeIndex+"].key="+sqlObj.column[activeIndex].key); 
							break;		
						default: 
								switch(nameType){
									case "TABLE": 
										sqlObj.table.push({name:eSQL.replace(new RegExp("[`,]",'g'),""), pseudo:""});
										tableIndex=sqlObj.table.length-1;						
										console.log("sqlObj.table["+tableIndex+"].name="+sqlObj.table[tableIndex].name); 						
										nameType="COLUMN"; 
										break;
									case "COLUMN": 
										sqlObj.column.push({name:eSQL.replace(new RegExp("[`,()]",'g'),""), type:"", pseudo:"", key:false}); 
										activeIndex=sqlObj.column.length-1; 
										console.log("sqlObj.column["+activeIndex+"].name="+sqlObj.column[activeIndex].name);
										break;
									case "VALUE":
										if (sqlObj.valueholder.length==sqlObj.column.length){ //value
											var valSql=eSQL;
											if (valSql.length>0){
												if (sqlObj.value.length==0){ //first record
													valSql=valSql.substr(1);
													valSql=valSql.substr(0,valSql.length-1);
												}else if(sqlObj.value.length==sqlObj.column.length){//last record
													valSql=valSql.substr(0,valSql.length-1);
												}else{//middle record
													valSql=valSql.substr(0,valSql.length-1);
												}
											}
											sqlObj.value.push({value:valSql}); 
											activeIndex=sqlObj.value.length-1; 
											console.log("sqlObj.value["+activeIndex+"].value="+sqlObj.value[activeIndex].value);								
										}else{ //value holder
											var valSql=eSQL;
											if (valSql.length>0){
												if (sqlObj.valueholder.length==0){ //first record
													valSql=valSql.substr(1);
													valSql=valSql.substr(0,valSql.length-1);
												}else if(sqlObj.valueholder.length==sqlObj.column.length){//last record
													valSql=valSql.substr(0,valSql.length-1);
												}else{//middle record
													valSql=valSql.substr(0,valSql.length-1);
												}
											}
											sqlObj.valueholder.push({value:valSql}); 
											activeIndex=sqlObj.valueholder.length-1; 
											console.log("sqlObj.valueholder["+activeIndex+"].value="+sqlObj.valueholder[activeIndex].value);								
										}
										break;
									case "PSEUDO": 
										if (nameSection=="TABLE"){
											sqlObj.table[tableIndex].pseudo=eSQL.replace(new RegExp("[`,(]",'g'),""); 
											console.log("sqlObj.table["+tableIndex+"].pseudo="+sqlObj.table[tableIndex].pseudo);
											nameType="TABLE";
										}else{
											sqlObj.column[activeIndex].pseudo=eSQL.replace(new RegExp("[`,(]",'g'),""); 
											console.log("sqlObj.column["+activeIndex+"].pseudo="+sqlObj.column[activeIndex].pseudo);
											nameType="COLUMN";
										}
										break;
									case "WHERE": 
										if (eSQL.charAt(0)!='['){
											if (eSQL.indexOf("=")!=-1&&eSQL.length>1){
												var whereSQL=eSQL.split("=");
												sqlObj.where.push({expression:whereSQL[0].replace(new RegExp("[`,(]",'g'),"")});
												whereIndex=sqlObj.where.length-1;
												console.log("sqlObj.where["+whereIndex+"].expression="+sqlObj.where[whereIndex].expression);
												sqlObj.where.push({expression:"="});
												whereIndex=sqlObj.where.length-1;
												console.log("sqlObj.where["+whereIndex+"].expression="+sqlObj.where[whereIndex].expression);
												sqlObj.where.push({expression:whereSQL[1].replace(new RegExp("[`,(]",'g'),"")});
												whereIndex=sqlObj.where.length-1;
												console.log("sqlObj.where["+whereIndex+"].expression="+sqlObj.where[whereIndex].expression);														
											}else{
												var whereSQL=eSQL.replace("(","");
												whereSQL=whereSQL.replace(")","");
												whereSQL=whereSQL.replace(new RegExp("[`,(]",'g'),"");
												sqlObj.where.push({expression:whereSQL});
												whereIndex=sqlObj.where.length-1;
												console.log("sqlObj.where["+whereIndex+"].expression="+sqlObj.where[whereIndex].expression);
											}
											break;
										}else{
											nameType="FILLVALUE";
										}								
									case "FILLVALUE":
										if (sqlObj.set.length>0){
											for (var i=0; i<sqlObj.set.length; i++){
												if (sqlObj.set[i].expression=="?"){
													var valSql=eSQL;
													valSql=valSql.substr(1);
													valSql=valSql.substr(0,valSql.length-1);
													sqlObj.set[i].expression=valSql;
													setIndex=i;											
													console.log("sqlObj.set["+setIndex+"].expression="+sqlObj.set[setIndex].expression);
													break;
												}
											}																		
										}else if(sqlObj.where.length>0){
											for (var i=0; i<sqlObj.where.length; i++){
												if (sqlObj.where[i].expression=="?"){
													var valSql=eSQL;
													valSql=valSql.substr(1);
													valSql=valSql.substr(0,valSql.length-1);
													sqlObj.where[i].expression=valSql;
													setIndex=i;											
													console.log("sqlObj.where["+setIndex+"].expression="+sqlObj.where[setIndex].expression);
													break;
												}
											}																		
										}
										break;							
									case "SET":
										var setSQL=eSQL.split(",");
										if (setSQL.length>1){
											setSQL.forEach(function(eSetSQL){
												sqlObj.set.push({expression:eSetSQL});
												setIndex=sqlObj.set.length-1;
												console.log("sqlObj.set["+setIndex+"].expression="+sqlObj.set[setIndex].expression);								
											});
										}else{
											sqlObj.set.push({expression:eSQL});
											setIndex=sqlObj.set.length-1;
											console.log("sqlObj.set["+setIndex+"].expression="+sqlObj.set[setIndex].expression);
										}
										break;
									case "LIMIT":
										if (sqlObj.limit==""){
											sqlObj.limit=eSQL;
											console.log("sqlObj.limit="+sqlObj.limit);
										}else{
											for (var i=0; i<sqlObj.where.length; i++){
												if (sqlObj.where[i].expression=="?"){
													var valSql=eSQL;
													valSql=valSql.substr(1);
													valSql=valSql.substr(0,valSql.length-1);
													sqlObj.where[i].expression=valSql;
													setIndex=sqlObj.where.length-1;											
													console.log("sqlObj.where["+setIndex+"].expression="+sqlObj.where[setIndex].expression);
													break;
												}
											}									
										}
										
										break;						
									default: break;
								}
							break;
					}
				}
			});
			return sqlObj;		
		}, //conn.sql2index
		getLawnCQuery:function(p_sqlObj){
			//getLawnCQuery is a Lawnchair 'where' clause generator specifically for persistenceJS
			var strWhere="";			
			for (var i=0; i<p_sqlObj.where.length; i++){
				switch(p_sqlObj.where[i].expression.toUpperCase()){
					case "1": // this is true record
						strWhere="";
						break;
					case "2": // this is false record
						strWhere="";
						break;
					case "=": 
						strWhere+="===";
						break;
					case "AND": //for persistence, this is normal case
						break;
					case "OR": break;
					default: 
						if (strWhere==""){
							var sqlExp=p_sqlObj.where[i].expression;
							var sqlExps=sqlExp.split(".");
							if (sqlExps.length>1){
								strWhere+="record."+p_sqlObj.table[0].name+"_"+sqlExps[sqlExps.length-1];
							}else{
								strWhere+="record."+p_sqlObj.table[0].name+"_"+sqlExp;
							}
						}else{
							var strExp=p_sqlObj.where[i].expression;
							if (strExp.charAt(0)=="'"||strExp.charAt(0)=='"'){
								strWhere+=p_sqlObj.where[i].expression;
							}else{						
								strWhere+='"'+p_sqlObj.where[i].expression+'"';
							}
						}
						break;
				}
			}
			return strWhere;		
		}//conn.getLawnCQuery
	}//conn
	return conn;
} //openIndexedDB
