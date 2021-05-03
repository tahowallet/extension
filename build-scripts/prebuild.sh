#!/bin/bash

if [ -d ./dist ]; then
  echo 'dist directory in place'; else
  mkdir dist && echo 'dist directory created';
fi



if [ ! -z "$1" ]; then
  if [[ "$1" == "platform" ]]; then
    if [ ! -z "$2" ]; then
      if [ -d ./dist/$2 ]; then
        echo $2 'directory in place'; else
        mkdir ./dist/$2 && echo $2 'directory created';
      fi
    fi
  fi
fi
