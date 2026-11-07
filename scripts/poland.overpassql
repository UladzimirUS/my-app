[out:csv(::type,::id,::lat,::lon,"amenity","parking_space","capacity:disabled","capacity","access","motor_vehicle","motorcar","vehicle","disabled","fee","name","operator","surface","parking","maxstay","opening_hours","description","note","inscription","ref";true)][timeout:300];
area["ISO3166-1"="PL"][admin_level=2]->.pl;
(
  nwr["amenity"="parking_space"]["parking_space"="disabled"]["access"!~"^(private|no)$"](area.pl);
  nwr["amenity"="parking_space"]["capacity:disabled"]["access"!~"^(private|no)$"](area.pl);
  nwr["amenity"="parking"]["capacity:disabled"]["capacity:disabled"!~"^(no|0)$"]["access"!~"^(private|no)$"](area.pl);
);
out center qt;
