import React, { useState } from 'react'
import Navbar from './Navbar'
import WatershedDetailsCard from './WatershedDetailsCard'
import MapView from './MapView'
import OfficerRightPanel from './OfficerRightPanel'
import BottomChartsRow from './BottomChartsRow'
import WatershedExplorerView from './WatershedExplorerView'
import InterventionsView from './InterventionsView'
import AnalyticsReportsView from './AnalyticsReportsView'
import DownloadsView from './DownloadsView'
import ResourcesView from './ResourcesView'
import SupportView from './SupportView'

export default function OfficerPortal({
  catalog,
  watershedId,
  onSelectWatershed,
  summary,
  overlays,
  layers,
  setLayers,
  basemap,
  setBasemap,
  interventions,
  photos,
  selectedId,
  selectIntervention,
  focus,
  radius,
  opacity,
  catchment,
  hotspots,
  loading,
  health,
  busy,
  downloadReport,
  currentUser,
  onLogout,
  analysis,
}) {
  const [navTab, setNavTab] = useState('home')

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] overflow-hidden select-none font-sans">
      {/* 3-Tier Official Government Header & Toolbar */}
      <Navbar
        catalog={catalog}
        watershedId={watershedId}
        onSelectWatershed={onSelectWatershed}
        health={health}
        busy={busy}
        onGenerateReport={() => downloadReport('watershed', watershedId)}
        currentUser={currentUser}
        onLogout={onLogout}
        activeNavTab={navTab}
        onSelectNavTab={setNavTab}
      />

      {/* DYNAMIC PAGE ROUTING: Clean Full-Width Container Without Redundant Side Panel */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden p-3">
        {navTab === 'explorer' && (
          <WatershedExplorerView
            catalog={catalog}
            watershedId={watershedId}
            onSelectWatershed={onSelectWatershed}
            summary={summary}
            overlays={overlays}
            layers={layers}
            setLayers={setLayers}
            basemap={basemap}
            setBasemap={setBasemap}
            interventions={interventions}
            photos={photos}
            selectedId={selectedId}
            selectIntervention={selectIntervention}
            focus={focus}
            radius={radius}
            opacity={opacity}
            catchment={catchment}
            hotspots={hotspots}
            loading={loading}
          />
        )}

        {navTab === 'interventions' && (
          <InterventionsView
            summary={summary}
            interventions={interventions}
            selectedId={selectedId}
            onSelect={(id) => selectIntervention(id, { open: true })}
            onDownload={downloadReport}
            busy={busy}
          />
        )}

        {navTab === 'analytics' && (
          <AnalyticsReportsView
            watershedId={watershedId}
            summary={summary}
            interventions={interventions}
            selectedId={selectedId}
            radius={radius}
            onDownload={downloadReport}
            busy={busy}
          />
        )}

        {navTab === 'downloads' && (
          <DownloadsView
            watershedId={watershedId}
            onDownload={downloadReport}
            busy={busy}
          />
        )}

        {navTab === 'resources' && (
          <ResourcesView />
        )}

        {navTab === 'support' && (
          <SupportView />
        )}

        {navTab === 'home' && (
          <div className="flex-1 flex gap-3 min-w-0 h-full overflow-y-auto pr-1">
            {/* Left Details & Map Center */}
            <div className="flex-1 flex flex-col gap-3 min-w-0 h-full">
              <div className="flex gap-3 h-[470px]">
                {/* Watershed Details Metadata Card */}
                <div className="w-[280px] shrink-0 h-full">
                  <WatershedDetailsCard summary={summary} />
                </div>

                {/* Geospatial Satellite Leaflet Map */}
                <div className="flex-1 min-w-0 h-full">
                  <MapView
                    summary={summary}
                    overlays={overlays}
                    layers={layers}
                    setLayers={setLayers}
                    basemap={basemap}
                    setBasemap={setBasemap}
                    interventions={interventions}
                    photos={photos}
                    selectedId={selectedId}
                    onSelect={selectIntervention}
                    focus={focus}
                    radius={radius}
                    opacity={opacity}
                    catchment={catchment}
                    hotspots={hotspots}
                    loading={loading}
                  />
                </div>
              </div>

              {/* Bottom Row Charts */}
              <BottomChartsRow />
            </div>

            {/* Right Panel */}
            <OfficerRightPanel
              summary={summary}
              analysis={analysis}
              onSelect={(id) => selectIntervention(id, { open: true })}
              onReport={() => downloadReport('intervention', selectedId)}
              busy={busy}
            />
          </div>
        )}
      </div>
    </div>
  )
}
