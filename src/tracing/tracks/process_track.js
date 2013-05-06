// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('tracing.analysis.object_snapshot_view');
base.require('tracing.analysis.object_instance_view');
base.require('tracing.tracks.container_track');
base.require('tracing.tracks.counter_track');
base.require('tracing.tracks.object_instance_track');
base.require('tracing.tracks.thread_track');
base.require('tracing.filter');
base.require('ui');

base.exportTo('tracing.tracks', function() {

  /**
   * Visualizes a Process by building ThreadTracks and CounterTracks.
   * @constructor
   */
  var ProcessTrack =
      ui.define(tracing.tracks.ContainerTrack);

  ProcessTrack.prototype = {

    __proto__: tracing.tracks.ContainerTrack.prototype,

    decorate: function() {
      this.classList.add('process-track');
      this.categoryFilter_ = new tracing.Filter();
    },

    get process() {
      return this.process_;
    },

    set process(process) {
      this.process_ = process;
      this.updateChildTracks_();
    },

    applyCategoryFilter_: function() {
      this.visible = (this.categoryFilter.matchProcess(this.process) &&
                      !!this.numVisibleChildTracks);
    },

    updateChildTracks_: function() {
      this.detach();
      if (this.process_) {
        // Create the object instance tracks for this process.
        var instancesByTypeName = this.process_.objects.getAllInstancesByTypeName();
        var instanceTypeNames = base.dictionaryKeys(instancesByTypeName);
        instanceTypeNames.sort();
        instanceTypeNames.forEach(function(typeName) {
          // Dont show snapshot tracks for types that dont have viewers.
          if (!ObjectSnapshotView.getViewConstructor(typeName) &&
              !ObjectInstanceView.getViewConstructor(typeName))
            return;
          var track = new tracing.tracks.ObjectInstanceTrack();
          track.heading = typeName + ':';
          track.objectInstances = instancesByTypeName[typeName];
          this.addTrack_(track);
        }.bind(this));


        // Add counter tracks for this process.
        var counters = [];
        for (var tid in this.process.counters) {
          counters.push(this.process.counters[tid]);
        }
        counters.sort(tracing.model.Counter.compare);

        // Create the counters for this process.
        counters.forEach(function(counter) {
          var track = new tracing.tracks.CounterTrack();
          track.heading = counter.name + ':';
          track.counter = counter;
          this.addTrack_(track);
        }.bind(this));

        // Get a sorted list of threads.
        var threads = [];
        for (var tid in this.process.threads)
          threads.push(this.process.threads[tid]);
        threads.sort(tracing.model.Thread.compare);

        // Create the threads.
        threads.forEach(function(thread) {
          var track = new tracing.tracks.ThreadTrack();
          track.heading = thread.userFriendlyName + ':';
          track.tooltip = thread.userFriendlyDetails;
          track.thread = thread;
          this.addTrack_(track);
        }.bind(this));
      }
    }
  };

  return {
    ProcessTrack: ProcessTrack
  };
});
