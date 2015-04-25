# generator-rean
## Esquema de la base de datos
**¿Cómo obtener, almacenar (y recuperar) y parsear el esquema de la base de datos? **

### 1. Obtener
Obtenemos TODAS las propiedades del esquema a través dle terminal.
#### 1.1 Propiedades de los atributos
##### 1.1.1 type
Será lo primero en preguntar. Tipos de datos permitidos:
- string
- number
- date
- boolean
- object
- array
- buffer
- point (no disponible)
- virtual(no disponible)


##### 1.1.2 required
Si el atributo es obligatorio.

##### 1.1.3 default
Sólo si no es *Required*

##### 1.1.4 Dependientes del tipo de datos:
###### string
- email : boolean
- uppercase : boolean
- lowercase : boolean
- alphanum : boolean
- regex : regexp
- enum : [string]
- min : number
- max : number

##### number
- min : number
- max : number
- integer : boolean

##### date
- min : date
- max : date

#### 1.2 Relaciones
Si la relación tiene atributos String mostrar todos los modelos y relacionarlos.
(No disponible)

#### 1.3 Algoritmo parseador
```javascript
function parseFromCL(attributeDefinition, propertyName, propertyValue, prerequisites, allowedCasts){
...	
}
```
Ejemplo:
```javascript
var attributeDefinition = {
	type : 'string'
};

var propertyName = 'email';

var propertyValue = true;

var prerequisites = {
	type : ['=', 'string'], //'string'
    alphanum : ['!', true], //'!alphanum' : true
};

parseFromCL(attributeDefinition, propertyName, propertyValue, prerequisites);
//Attribute definition will be ->
/*
{
	type: 'string',
    email: true
}
*/
```

Ejemplo 2:
```javascript
var aD = {type: 'string', lowercase : true};
var pN = 'email';
var pV = true;
var pre = {
	type : 'string',
    '!alphanum' : true,
    '!uppercase' : true,
    '!lowecase' : true
}
parseFromCL(aD, pN, pV, pre, ['string']);
//aD will be
/*
{
	type: 'string', 
	lowercase : true
}
*/
```


### 2.Almacenar
Los esquemas de la base de datos se almacenan en un archivo dentro de la carpeta /app/models con el nombre *modelName*.model.schema.json

### 3. Enviar esquema al DOM y a la definición del modelo de la BD
#### 3.1 Enviar al DOM
(No disponible)
#### 3.2 Enviar a la definción del modelo de la BD
Recorremos todos los attributos y todas las propiedades. 
- Las propeidades de aquellos atributos cuyo valor sea un booleano si es falso no se muestra.
- Para el resto de attributos se parsearán con un método cuyo nombre es la clave de la propiedad y argumento el valor.
- La función de parseo será llamando a JSON.stringify con algunas comprobaciones extra:
- Las propiedades de aquellos atributos cuyo valor sea un string deberemos parsearlo para ver si es una función o un string.


