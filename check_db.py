import urllib.request, json

url = "http://localhost:5003/api/businesses?limit=100"
with urllib.request.urlopen(url) as resp:
    d = json.loads(resp.read())

print(f"=== ALL {d['pagination']['total']} BUSINESSES ===\n")
for r in d['data']:
    issues = []
    if r['tags'] and isinstance(r['tags'], str): issues.append('tags=STRING')
    if str(r['rating']) == '0.0': issues.append('rating=0.0')
    if not r['location'] and not r['city_name']: issues.append('NO LOCATION')
    if not r['description']: issues.append('NO DESC')
    if not r['phone']: issues.append('NO PHONE')
    if not r['email']: issues.append('NO EMAIL')
    if not r['address']: issues.append('NO ADDR')
    if r['category_name'] is None: issues.append('NO CATEGORY')
    if r['latitude'] is None: issues.append('NO GPS')
    flag = '  !! ' + ', '.join(issues) if issues else ''
    loc = r['location'] or r['city_name'] or '????'
    cat = r['category_name'] or 'NONE'
    print(f"[{r['id']:>3}] {r['name']:<44} | {loc:<16} | {cat:<36} | r={r['rating']} rev={r['reviews']} tags={r['tags']}{flag}")

print("\n=== SUMMARY ===")
total = len(d['data'])
no_desc = sum(1 for r in d['data'] if not r['description'])
no_phone = sum(1 for r in d['data'] if not r['phone'])
no_email = sum(1 for r in d['data'] if not r['email'])
no_addr = sum(1 for r in d['data'] if not r['address'])
no_gps = sum(1 for r in d['data'] if r['latitude'] is None)
no_cat = sum(1 for r in d['data'] if r['category_name'] is None)
zero_rat = sum(1 for r in d['data'] if str(r['rating']) == '0.0')
str_tags = sum(1 for r in d['data'] if r['tags'] and isinstance(r['tags'], str))
empty_tags = sum(1 for r in d['data'] if not r['tags'] or r['tags'] == [])

print(f"  Total businesses:    {total}")
print(f"  No description:      {no_desc}")
print(f"  No phone:            {no_phone}")
print(f"  No email:            {no_email}")
print(f"  No address:          {no_addr}")
print(f"  No GPS coords:       {no_gps}")
print(f"  No category:         {no_cat}")
print(f"  Rating = 0.0:        {zero_rat}")
print(f"  Tags as string:      {str_tags}")
print(f"  Empty tags:          {empty_tags}")
