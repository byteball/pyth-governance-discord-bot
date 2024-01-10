function getUnitData(objTriggerUnit){
	for (var i=0; i < objTriggerUnit.messages.length; i++)
		if (objTriggerUnit.messages[i].app === 'data')
			return objTriggerUnit.messages[i].payload;
	return {};
}

module.exports = {
	getUnitData,
}
