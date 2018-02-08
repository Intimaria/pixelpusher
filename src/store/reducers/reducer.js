import { List } from 'immutable'
import {
  resizeProject, setGridCellValue,
  applyBucket, addFrameToProject, getProject, updateProject,
  setProject
} from './reducerHelpers'
import * as Mutation from '../../logic/Mutation'
import Project, { project } from '../../records/Project'
import State from '../../records/State'
import Peer from '../../records/Peer'
import PeerInfo from '../../records/PeerInfo'
import CloudPeer from '../../records/CloudPeer'

const getPalette = state =>
  getProject(state).doc.getIn('palette')

const getFrames = state =>
  getProject(state).doc.get('frames')

const setProjectId = (state, id) =>
  state.set('currentProjectId', id).merge({
    activeFrameIndex: 0
  })

const stateLoaded = state =>
  state.set('isLoaded', true)

const addProject = (state, project) =>
  state.setIn(['projects', project.id], project)

function changeDimensions (state, dimension, behavior) {
  return resizeProject(state, dimension, behavior)
}

function setColorSelected (state, swatchId) {
  return state.merge({
    eraserOn: false,
    eyedropperOn: false,
    colorPickerOn: false,
    currentSwatchIndex: swatchId
  })
}

function drawCell (state, pixelIndex) {
  const bucketOn = state.get('bucketOn')
  const eyedropperOn = state.get('eyedropperOn')
  const eraserOn = state.get('eraserOn')

  if (bucketOn || eyedropperOn) {
    const activeFrameIndex = state.get('activeFrameIndex')
    const swatchId = getFrames(state).getIn([activeFrameIndex, 'pixels', pixelIndex])

    if (eyedropperOn) {
      return setColorSelected(state, swatchId)
    }
    // bucketOn
    return applyBucket(state, activeFrameIndex, pixelIndex, swatchId)
  }
  // eraserOn or regular cell paint
  const swatchId = eraserOn
  ? null : state.currentSwatchIndex

  return setGridCellValue(state, pixelIndex, swatchId)
}

function setEraser (state) {
  return state.merge({
    currentSwatchIndex: null,
    eraserOn: true,
    eyedropperOn: false,
    colorPickerOn: false,
    bucketOn: false
  })
}

function setBucket (state) {
  return state.merge({
    eraserOn: false,
    eyedropperOn: false,
    colorPickerOn: false,
    bucketOn: !state.get('bucketOn')
  })
}

function setEyedropper (state) {
  return state.merge({
    eraserOn: false,
    eyedropperOn: true,
    colorPickerOn: false,
    bucketOn: false
  })
}

function setColorPicker (state) {
  return state.merge({
    eraserOn: false,
    eyedropperOn: false,
    colorPickerOn: true,
    bucketOn: false
  })
}

function setCellSize (state, cellSize) {
  return updateProject(state, Mutation.setCellSize(cellSize))
}

function resetFrame (state, activeFrameIndex) {
  return updateProject(state, Mutation.resetFrame(activeFrameIndex))
}

function showSpinner (state) {
  return state.merge({ loading: true })
}

function hideSpinner (state) {
  return state.merge({ loading: false })
}

function sendNotification (state, message) {
  return state.merge({
    notifications: message === '' ? List() : List([{ message, id: 0 }])
  })
}

function changeActiveFrame (state, frameIndex) {
  return state.merge({ activeFrameIndex: frameIndex })
}

function createNewFrame (state) {
  return addFrameToProject(state)
    .set('activeFrameIndex', getFrames(state).size)
}

function deleteFrame (state, frameIndex) {
  return updateProject(state, Mutation.deleteFrame(frameIndex, state.activeFrameIndex))
    .update('activeFrameIndex', i =>
      frameIndex > i ? i : i - 1)
}

function duplicateFrame (state, frameIndex) {
  return updateProject(state, Mutation.cloneFrame(frameIndex))
    .update('activeFrameIndex', i => i + 1)
}

const newProject = state =>
  state.merge({
    currentProject: project(),
    activeFrameIndex: 0,
    currentSwatchIndex: 0
  })

function setDuration (state, duration) {
  return state.merge({ duration })
}

function changeFrameInterval (state, frameIndex, interval) {
  return updateProject(state, Mutation.setFrameInterval(frameIndex, interval))
}

const peerConnected = (state, key, id, info) =>
  state.setIn(['peers', id], Peer({key, id, isConnected: true, info: PeerInfo(info.peerInfo)}))

const selfConnected = (state, key, id, canEdit) =>
  state.setIn(['peers', id], Peer({key, id, isSelf: true, isConnected: true, canEdit, info: state.peerInfo}))

const peerDisconnected = (state, key, id) =>
  state.deleteIn(['peers', id])
  // state.setIn(['peers', id, 'isConnected'], false)

const remoteProjectUpdated = (state, project) => {
  const prevProject = state.projects.get(project.id)

  return prevProject && prevProject.isOpening
  ? setProject(state, project)
  : addProject(state, project)
}

const makeProject = ({id, doc, isWritable}) =>
  Project({ id, doc, isWritable })

export default function (state = State(), action) {
  console.log(action)

  switch (action.type) {
    // HyperMerge actions:

    case 'HYPERMERGE_READY':
      return state.setIn(['archiverKey'], action.archiverKey)

    case 'DOCUMENT_READY':
      return addProject(state, makeProject(action))

    case 'DOCUMENT_UPDATED':
      return remoteProjectUpdated(state, makeProject(action))

    case 'DOCUMENT_FORKED':
    case 'DOCUMENT_MERGED':
    case 'DOCUMENT_OPENED':
      return setProject(state, makeProject(action))

    case 'DOCUMENT_CREATED':
      return setProject(state, makeProject(action))

    case 'DOCUMENT_DELETED':
      return sendNotification(state, 'Project deleted')
      .update('currentProjectId', cId => cId === action.id ? null : cId)
      .update('projects', ps => ps.delete(action.id))

    // End HyperMerge actions

    case 'STATE_LOADED':
      return stateLoaded(action.state)
    case 'CHANGE_DIMENSIONS':
      return changeDimensions(state, action.gridProperty, action.behaviour)
    case 'SET_COLOR_SELECTED':
      return setColorSelected(state, action.newColorSelected)
    case 'SWATCH_CLICKED':
      return state.merge({
        currentSwatchIndex: action.index,
        eraserOn: false,
        eyedropperOn: false,
        colorPickerOn: false,
        bucketOn: false
      })
    case 'SET_SWATCH_COLOR':
      return state.currentSwatchIndex != null
        ? updateProject(state, Mutation.setSwatchColor(state.currentSwatchIndex, action.color))
        : updateProject(state, Mutation.addColorToPalette(action.color))
            .set('currentSwatchIndex', getPalette(state).size)
    case 'DRAW_CELL':
      return drawCell(state, action.id)
    case 'SET_ERASER':
      return setEraser(state)
    case 'SET_BUCKET':
      return setBucket(state)
    case 'SET_EYEDROPPER':
      return setEyedropper(state)
    case 'SET_COLOR_PICKER':
      return setColorPicker(state)
    case 'SET_CELL_SIZE':
      return setCellSize(state, action.cellSize)
    case 'SET_RESET_GRID':
      return resetFrame(state, action.activeFrameIndex)
    case 'SHOW_SPINNER':
      return showSpinner(state)
    case 'HIDE_SPINNER':
      return hideSpinner(state)
    case 'SEND_NOTIFICATION':
      return sendNotification(state, action.message)
    case 'CHANGE_ACTIVE_FRAME':
      return changeActiveFrame(state, action.frameIndex)
    case 'CREATE_NEW_FRAME':
      return createNewFrame(state)
    case 'DELETE_FRAME':
      return deleteFrame(state, action.frameIndex)
    case 'DUPLICATE_FRAME':
      return duplicateFrame(state, action.frameIndex)
    case 'SET_DURATION':
      return setDuration(state, action.duration)
    case 'CHANGE_FRAME_INTERVAL':
      return changeFrameInterval(state, action.frameIndex, action.interval)
    case 'NEW_PROJECT':
      return newProject(state)
    case 'PROJECT_TITLE_CHANGED':
      return updateProject(state, Mutation.setTitle(action.title))
    case 'SELF_NAME_CHANGED':
      return state.setIn(['peerInfo', 'name'], action.name)
    case 'SELF_AVATAR_SET':
      return state.setIn(['peerInfo', 'avatarKey'], action.key)

    case 'SET_PROJECT':
      return setProjectId(state, action.id)

    case 'PEER_CONNECTED':
      return peerConnected(state, action.key, action.id, action.info)
    case 'SELF_CONNECTED':
      return selfConnected(state, action.key, action.id, action.writable)
    case 'PEER_DISCONNECTED':
      return peerDisconnected(state, action.key, action.id)
    case 'PIXELS_IMPORTED':
      return updateProject(state, Mutation.addFrameFromPixels(action.pixels, action.width, action.height))

    case 'MERGE_PREVIEW_STARTED':
      return state.set('mergePreviewProjectId', action.id)

    case 'MERGE_PREVIEW_ENDED':
      return state.delete('mergePreviewProjectId')

    case 'PIXEL_CONFLICT_CLICKED':
      return setGridCellValue(state, action.index, action.swatchIndex)

    case 'PROJECT_VERSION_CLICKED':
      return setProjectId(state, action.id)

    case 'PROJECT_VERSION_DOUBLE_CLICKED':
      return setProjectId(state, action.id)

    case 'ADD_CLOUD_PEER':
      return state.setIn(['cloudPeers', action.key], CloudPeer())

    case 'REMOVE_CLOUD_PEER':
      return state.deleteIn(['cloudPeers', action.key])

    case 'CLOUD_PEER_PING':
      const cloudPeer = CloudPeer({
        name: action.name,
        timestamp: action.timestamp
      })
      return state.setIn(['cloudPeers', action.key], cloudPeer)

    default:
      return state
  }
}
