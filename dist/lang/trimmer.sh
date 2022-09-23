#!/bin/bash

langfile="en.json"

strings=$(grep CPR $langfile  | awk -F "\"" '{print $2}')
for str in $strings; do
    grep -rq --exclude=$langfile --exclude-dir=node_modules $str ../*
    if [ $? != 0 ] ; then
        sed -i /$str/d $langfile
    fi
done
echo "Trimming done."
